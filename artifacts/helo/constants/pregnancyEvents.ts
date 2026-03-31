export type MedicalEventType = 'rdv' | 'echo' | 'vaccin' | 'accouchement';

export interface PregnancyEvent {
  week: number;
  label: string;
  type: MedicalEventType;
  icon: string;
  description: string;
}

export const PREGNANCY_EVENTS: PregnancyEvent[] = [
  {
    week: 12,
    label: '1ère échographie',
    type: 'echo',
    icon: '🔬',
    description: 'Échographie du 1er trimestre — clarté nucale, terme, dépistage T21',
  },
  {
    week: 16,
    label: 'Consultation 4e mois',
    type: 'rdv',
    icon: '📋',
    description: 'Consultation médicale obligatoire du 4e mois',
  },
  {
    week: 22,
    label: '2e échographie',
    type: 'echo',
    icon: '🔬',
    description: 'Échographie morphologique du 2e trimestre — examen détaillé des organes',
  },
  {
    week: 24,
    label: 'Consultation 6e mois',
    type: 'rdv',
    icon: '📋',
    description: 'Consultation médicale obligatoire du 6e mois — dépistage diabète gestationnel',
  },
  {
    week: 28,
    label: 'Vaccin coqueluche',
    type: 'vaccin',
    icon: '💉',
    description: 'Vaccination contre la coqueluche recommandée à partir de 28 SA',
  },
  {
    week: 32,
    label: '3e échographie',
    type: 'echo',
    icon: '🔬',
    description: 'Échographie du 3e trimestre — croissance fœtale, position, placenta',
  },
  {
    week: 34,
    label: 'Consultation 8e mois',
    type: 'rdv',
    icon: '📋',
    description: 'Consultation médicale du 8e mois — plan de naissance, préparation',
  },
  {
    week: 37,
    label: 'Consultation pré-accouchement',
    type: 'rdv',
    icon: '📋',
    description: 'Consultation de fin de grossesse — bébé à terme, sac de maternité prêt',
  },
  {
    week: 39,
    label: 'Terme proche',
    type: 'rdv',
    icon: '📋',
    description: 'Surveillance renforcée — accouchement peut survenir entre 39 et 41 SA',
  },
  {
    week: 40,
    label: 'Accouchement prévu',
    type: 'accouchement',
    icon: '🎉',
    description: 'Date prévue d\'accouchement — félicitations !',
  },
];

export function getEventsForWeek(week: number): PregnancyEvent[] {
  return PREGNANCY_EVENTS.filter((e) => e.week === week);
}
