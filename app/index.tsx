import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { couleurs } from '@/theme/couleurs';

export default function AccueilScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.ecran}>
      <View style={styles.contenu}>
        <Text style={styles.titre}>{t('app.titre')}</Text>
        <Text style={styles.description}>{t('app.bienvenue')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  titre: {
    color: couleurs.texte,
    fontSize: 32,
    fontWeight: '700',
  },
  description: {
    color: couleurs.texteSecondaire,
    fontSize: 18,
    lineHeight: 26,
    marginTop: 12,
  },
});
