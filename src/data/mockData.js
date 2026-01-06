// Opposition Constants
export const OPPOSITIONS = {
    ADMIN: 'admin',
    MADRID: 'madrid'
};

// Configuration Mapping: Opposition ID -> Firebase 'category' field
// 'Subaltern' matches the existing VITE_CATEGORY default
// 'ayto_madrid' is the proposed category for the new opposition
export const OPPOSITION_CONFIG = {
    [OPPOSITIONS.ADMIN]: {
        category: 'Subaltern',
        title: 'Oposiciones Administración'
    },
    [OPPOSITIONS.MADRID]: {
        category: 'ayto_madrid',
        title: 'Técnico Ayto. Madrid'
    }
};

export const getOppositionConfig = (oppositionId) => {
    return OPPOSITION_CONFIG[oppositionId] || OPPOSITION_CONFIG[OPPOSITIONS.ADMIN];
};
