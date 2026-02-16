import re
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import tensorflow as tf
import keras
from keras import layers
from keras.applications import efficientnet
from keras.layers import TextVectorization


def custom_standardization_factory(strip_chars: str):
    def custom_standardization(input_string):
        lowercase = tf.strings.lower(input_string)
        return tf.strings.regex_replace(lowercase, "[%s]" % re.escape(strip_chars), "")

    return custom_standardization


def build_vectorizer(
    vocab: List[str],
    vocab_size: int,
    seq_length: int,
    strip_chars: str,
) -> TextVectorization:
    vectorization = TextVectorization(
        max_tokens=vocab_size,
        output_mode="int",
        output_sequence_length=seq_length,
        standardize=custom_standardization_factory(strip_chars),
    )
    # Very important: reproduce the same token->id as in training.
    # Some Keras versions may treat reserved tokens (ex.: "" and "[UNK]")
    # in a special way. We validate complete equality to avoid subtle mismatches.
    vectorization.set_vocabulary(vocab)
    got = vectorization.get_vocabulary()
    if got != vocab:
        raise ValueError(
            "Vocabulário reconstruído diferente do salvo. "
            "Isso causa mismatch de ids e captions incorretas."
        )
    return vectorization


def get_index_to_word(vocab: List[str]) -> Dict[int, str]:
    return {idx: word for idx, word in enumerate(vocab)}


def get_cnn_model(image_size: Tuple[int, int]):
    base_model = efficientnet.EfficientNetB0(
        input_shape=(*image_size, 3),
        include_top=False,
        weights=None,  # do not download weights; they will be loaded from the exported .weights.h5 file
    )
    base_model.trainable = False
    base_model_out = base_model.output
    base_model_out = layers.Reshape((-1, base_model_out.shape[-1]))(base_model_out)
    cnn_model = keras.models.Model(base_model.input, base_model_out)
    return cnn_model


class TransformerEncoderBlock(layers.Layer):
    def __init__(self, embed_dim: int, dense_dim: int, num_heads: int, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.dense_dim = dense_dim
        self.num_heads = num_heads
        self.attention_1 = layers.MultiHeadAttention(
            num_heads=num_heads, key_dim=embed_dim, dropout=0.0
        )
        self.layernorm_1 = layers.LayerNormalization()
        self.layernorm_2 = layers.LayerNormalization()
        self.dense_1 = layers.Dense(embed_dim, activation="relu")

    def call(self, inputs, training, mask=None):
        inputs = self.layernorm_1(inputs)
        inputs = self.dense_1(inputs)
        attention_output_1 = self.attention_1(
            query=inputs,
            value=inputs,
            key=inputs,
            attention_mask=None,
            training=training,
        )
        out_1 = self.layernorm_2(inputs + attention_output_1)
        return out_1


class PositionalEmbedding(layers.Layer):
    def __init__(self, sequence_length: int, vocab_size: int, embed_dim: int, **kwargs):
        super().__init__(**kwargs)
        self.token_embeddings = layers.Embedding(
            input_dim=vocab_size, output_dim=embed_dim
        )
        self.position_embeddings = layers.Embedding(
            input_dim=sequence_length, output_dim=embed_dim
        )
        self.sequence_length = sequence_length
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.embed_scale = tf.math.sqrt(tf.cast(embed_dim, tf.float32))

    def call(self, inputs):
        length = tf.shape(inputs)[-1]
        positions = tf.range(start=0, limit=length, delta=1)
        embedded_tokens = self.token_embeddings(inputs)
        embedded_tokens = embedded_tokens * self.embed_scale
        embedded_positions = self.position_embeddings(positions)
        return embedded_tokens + embedded_positions

    def compute_mask(self, inputs, mask=None):
        return tf.math.not_equal(inputs, 0)


class TransformerDecoderBlock(layers.Layer):
    def __init__(self, embed_dim: int, ff_dim: int, num_heads: int, vocab_size: int, seq_length: int, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.ff_dim = ff_dim
        self.num_heads = num_heads

        self.attention_1 = layers.MultiHeadAttention(
            num_heads=num_heads, key_dim=embed_dim, dropout=0.1
        )
        self.cross_attention_2 = layers.MultiHeadAttention(
            num_heads=num_heads, key_dim=embed_dim, dropout=0.1
        )
        self.ffn_layer_1 = layers.Dense(ff_dim, activation="relu")
        self.ffn_layer_2 = layers.Dense(embed_dim)

        self.layernorm_1 = layers.LayerNormalization()
        self.layernorm_2 = layers.LayerNormalization()
        self.layernorm_3 = layers.LayerNormalization()

        self.embedding = PositionalEmbedding(
            embed_dim=embed_dim,
            sequence_length=seq_length,
            vocab_size=vocab_size,
        )
        self.out = layers.Dense(vocab_size, activation="softmax")

        self.dropout_1 = layers.Dropout(0.3)
        self.dropout_2 = layers.Dropout(0.5)
        self.supports_masking = True

    def call(self, inputs, encoder_outputs, training, mask=None):
        inputs = self.embedding(inputs)
        causal_mask = self.get_causal_attention_mask(inputs)

        padding_mask = None
        combined_mask = causal_mask
        if mask is not None:
            padding_mask = tf.cast(mask[:, :, tf.newaxis], dtype=tf.int32)
            combined_mask = tf.cast(mask[:, tf.newaxis, :], dtype=tf.int32)
            combined_mask = tf.minimum(combined_mask, causal_mask)

        attention_output_1 = self.attention_1(
            query=inputs,
            value=inputs,
            key=inputs,
            attention_mask=combined_mask,
            training=training,
        )
        out_1 = self.layernorm_1(inputs + attention_output_1)

        cross_attention_output_2 = self.cross_attention_2(
            query=out_1,
            value=encoder_outputs,
            key=encoder_outputs,
            attention_mask=padding_mask,
            training=training,
        )
        out_2 = self.layernorm_2(out_1 + cross_attention_output_2)

        ffn_out = self.ffn_layer_1(out_2)
        ffn_out = self.dropout_1(ffn_out, training=training)
        ffn_out = self.ffn_layer_2(ffn_out)

        ffn_out = self.layernorm_3(ffn_out + out_2, training=training)
        ffn_out = self.dropout_2(ffn_out, training=training)

        preds = self.out(ffn_out)
        return preds

    def get_causal_attention_mask(self, inputs):
        input_shape = tf.shape(inputs)
        batch_size, sequence_length = input_shape[0], input_shape[1]
        i = tf.range(sequence_length)[:, tf.newaxis]
        j = tf.range(sequence_length)
        mask = tf.cast(i >= j, dtype="int32")
        mask = tf.reshape(mask, (1, input_shape[1], input_shape[1]))
        mult = tf.concat(
            [tf.expand_dims(batch_size, -1), tf.constant([1, 1], dtype=tf.int32)],
            axis=0,
        )
        return tf.tile(mask, mult)


class ImageCaptioningModel(keras.Model):
    def __init__(self, cnn_model, encoder, decoder, image_aug=None):
        super().__init__()
        self.cnn_model = cnn_model
        self.encoder = encoder
        self.decoder = decoder
        self.image_aug = image_aug


@dataclass(frozen=True)
class CaptioningArtifacts:
    weights_path: str
    vocab: List[str]
    index_to_word: Dict[int, str]
    vectorizer: TextVectorization
    model: ImageCaptioningModel
    image_size: Tuple[int, int]
    seq_length: int


def build_and_load_captioning(
    *,
    weights_path: str,
    vocab: List[str],
    image_size: Tuple[int, int],
    seq_length: int,
    vocab_size: int,
    embed_dim: int,
    ff_dim: int,
    encoder_num_heads: int,
    decoder_num_heads: int,
    strip_chars: str,
) -> CaptioningArtifacts:
    vectorizer = build_vectorizer(
        vocab=vocab,
        vocab_size=vocab_size,
        seq_length=seq_length,
        strip_chars=strip_chars,
    )
    # VERY IMPORTANT:
    # In the notebook, the idx->token mapping comes from *vectorizer.get_vocabulary()*.
    # If for any reason the internal order differs (e.g., due to Keras version),
    # using `vocab` directly here worsens inference (id mismatch).
    effective_vocab = vectorizer.get_vocabulary()
    index_to_word = get_index_to_word(effective_vocab)

    cnn_model = get_cnn_model(image_size=image_size)
    encoder = TransformerEncoderBlock(embed_dim=embed_dim, dense_dim=ff_dim, num_heads=encoder_num_heads)
    decoder = TransformerDecoderBlock(
        embed_dim=embed_dim,
        ff_dim=ff_dim,
        num_heads=decoder_num_heads,
        vocab_size=vocab_size,
        seq_length=seq_length,
    )
    caption_model = ImageCaptioningModel(cnn_model=cnn_model, encoder=encoder, decoder=decoder)

    # Create variables (necessary before load_weights in subclassed models)
    dummy_img = tf.zeros([1, image_size[0], image_size[1], 3], dtype=tf.float32)
    img_embed = caption_model.cnn_model(dummy_img)
    encoded_img = caption_model.encoder(img_embed, training=False)
    dummy_tokens = tf.zeros([1, seq_length - 1], dtype=tf.int32)
    dummy_mask = tf.math.not_equal(dummy_tokens, 0)
    _ = caption_model.decoder(dummy_tokens, encoded_img, training=False, mask=dummy_mask)

    # Keras may require that the "root" model be marked as built to allow load_weights().
    # Since the training in the notebook uses sublayers directly (custom train_step), the model.built
    # may be False even with variables already created.
    caption_model.built = True

    caption_model.load_weights(weights_path)

    return CaptioningArtifacts(
        weights_path=weights_path,
        vocab=effective_vocab,
        index_to_word=index_to_word,
        vectorizer=vectorizer,
        model=caption_model,
        image_size=image_size,
        seq_length=seq_length,
    )


def preprocess_image_bytes(image_bytes: bytes, image_size: Tuple[int, int]) -> np.ndarray:
    # Same as in the notebook (TensorFlow): decode -> resize -> convert_image_dtype(float32 in [0,1])
    img = tf.io.decode_image(image_bytes, channels=3, expand_animations=False)
    img = tf.image.resize(img, image_size)
    img = tf.image.convert_image_dtype(img, tf.float32)
    return img.numpy()


def greedy_caption(
    *,
    image_array: np.ndarray,
    artifacts: CaptioningArtifacts,
) -> str:
    model = artifacts.model
    vectorizer = artifacts.vectorizer
    index_to_word = artifacts.index_to_word
    max_decoded_sentence_length = artifacts.seq_length - 1

    image = tf.convert_to_tensor(image_array, dtype=tf.float32)
    image = tf.expand_dims(image, 0)
    image = model.cnn_model(image)
    encoded_img = model.encoder(image, training=False)

    decoded_caption = "<start> "
    for i in range(max_decoded_sentence_length):
        tokenized_caption = vectorizer([decoded_caption])[:, :-1]
        mask = tf.math.not_equal(tokenized_caption, 0)
        predictions = model.decoder(
            tokenized_caption, encoded_img, training=False, mask=mask
        )
        sampled_token_index = int(tf.argmax(predictions[0, i, :]).numpy())
        sampled_token = index_to_word.get(sampled_token_index, "")
        if sampled_token == "<end>":
            break
        # Align with the notebook: always "append" the sampled token.
        # (Even if it is an empty string, the resulting string is identical in terms
        # of whitespace tokenization, and avoids divergence in the loop.)
        decoded_caption += " " + sampled_token

    # Align with the notebook (final formatting)
    decoded_caption = decoded_caption.replace("<start> ", "")
    decoded_caption = decoded_caption.replace(" <end>", "").strip()
    return decoded_caption


