import { Fragment } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { theme } from '@/theme'

import { ResultCard } from '@/components/result-card'
import { VoiceCommandActions } from '@/components/voice-command-actions'

export function Actions() {
  return (
    <View style={styles.container}>
      <View style={styles.resultCardContainer}>
        <ResultCard title="Resultado" accessibilityLabel="Resultado">
          {/* <Text style={styles.resultCardText}>
            Um texto longo para testar o resultado card. Um texto longo para
            testar o resultado cardUm texto longo para testar o resultado cardUm
            texto longo para testar o resultado cardUm texto longo para testar o
            resultado cardUm texto longo para testar o resultado cardUm texto
            longo para testar o resultado card
          </Text> */}
          <View style={styles.resultCardTextContainer}>
            {[
              { class: 'teste', confidence: 0.9 },
              { class: 'teste2', confidence: 0.8 },
              { class: 'teste3', confidence: 0.7 },
            ].map((obj, index) => {
              return (
                <Fragment key={index}>
                  <Text style={styles.resultCardTextItem}>
                    {obj.class}: {(obj.confidence * 100).toFixed(1)}%
                  </Text>
                  {index < 2 && (
                    <Text style={styles.resultCardTextItem}>{'  |  '}</Text>
                  )}
                </Fragment>
              )
            })}
          </View>
        </ResultCard>
      </View>
      <VoiceCommandActions />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    gap: theme.spacing.sm,
  },
  resultCardContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resultCardText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.gray[800],
    textAlign: 'center',
  },
  resultCardTextContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCardTextItem: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.gray[800],
    textAlign: 'center',
  },
})
