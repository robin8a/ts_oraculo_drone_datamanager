/** Niveles lógicos PAIS → … → ID_ARBOL (coinciden con segmentos de ruta bajo el prefijo del proyecto). */
export const GEO_HIERARCHY_LEVEL_LABELS = [
  'País',
  'Departamento',
  'Municipio',
  'Predio',
  'Parcela',
  'Árbol (ID)',
] as const;

export const GEO_HIERARCHY_EXAMPLE_PATH =
  'CO/MET/NAV/PR001/NVJ00225/TR428/vuelo_de_drone_001';

export const GEO_HIERARCHY_ID_EXAMPLE = 'CO_MET_NAV_PR001_NVJ00225_TR428';

export const getGeoLevelLabel = (segmentIndexZeroBased: number): string => {
  if (segmentIndexZeroBased < GEO_HIERARCHY_LEVEL_LABELS.length) {
    return GEO_HIERARCHY_LEVEL_LABELS[segmentIndexZeroBased];
  }
  return `Nivel ${segmentIndexZeroBased + 1}`;
};
