import { questions2019m1 } from './tests/2019_model1';
import { questions2019m2 } from './tests/2019_model2';
import { questions2019m3 } from './tests/2019_model3';
import { questions2018m1 } from './tests/2018_model1';
import { questions2018m2 } from './tests/2018_model2';
import { questions2018m3 } from './tests/2018_model3';
import { questions2018m4 } from './tests/2018_model4';
import { questions2018m5 } from './tests/2018_model5';
import { questionsTema1 } from './themes/tema1';
import { questionsTema2 } from './themes/tema2';
import { questionsTema4 } from './themes/tema4';
import { questionsTema5Estatut } from './themes/tema5_estatut';
import { questionsTema5Consejos } from './themes/tema5_consejos';
import { questionsTema15 } from './themes/tema15';

// Helper to generate questions
const generateQuestions = (count, topic) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        pregunta: `Pregunta ${i + 1} sobre ${topic}`,
        opcions: [
            "a) Opción A incorrecta",
            "b) Opción B correcta",
            "c) Opción C incorrecta",
            "d) Opción D incorrecta"
        ],
        resposta_correcta: "b) Opción B correcta",
        explicacio: `Esta es la explicación de la pregunta ${i + 1}. La respuesta correcta es la B.`
    }));
};

export const tests2019 = [
    { id: '2019_m1', name: 'Modelo 1', examen: 'Subaltern - Model 1', preguntes: questions2019m1 },
    { id: '2019_m2', name: 'Modelo 2', examen: 'Subaltern - Model 2', preguntes: questions2019m2 },
    { id: '2019_m3', name: 'Modelo 3', examen: 'Subaltern - Model 3', preguntes: questions2019m3 },
];

export const tests2018 = [
    { id: '2018_m1', name: 'Modelo 1', examen: 'Subaltern - Qüestionari A', preguntes: questions2018m1 },
    { id: '2018_m2', name: 'Modelo 2', examen: 'Subaltern - Qüestionari B', preguntes: questions2018m2 },
    { id: '2018_m3', name: 'Modelo 3', examen: 'Subaltern - Qüestionari C', preguntes: questions2018m3 },
    { id: '2018_m4', name: 'Modelo 4', examen: 'Subaltern - Qüestionari D', preguntes: questions2018m4 },
    { id: '2018_m5', name: 'Modelo 5', examen: 'Subaltern - Qüestionari E', preguntes: questions2018m5 },
];

export const themes = [
    { id: 'theme_1', name: 'Tema 1: Constitución', examen: 'Tema 1: Constitució Espanyola 1978 - Estructura i Principis', preguntes: questionsTema1 },
    { id: 'theme_2', name: 'Tema 2: Estatut', examen: 'Tema 2: Derechos Fundamentales, TC y Reforma', preguntes: questionsTema2 },
    { id: 't4', name: 'Tema 4: Organización territorial', examen: 'Tema 4: Organización Territorial y Estatutos de Autonomía', preguntes: questionsTema4 },
    { id: 't5_est', name: 'Tema 5: Estatuto Autonomia', examen: 'Tema 5: Estatuto de Autonomía de las Illes Balears', preguntes: questionsTema5Estatut },
    { id: 't5_cons', name: 'Tema 5: Consejos insulares', examen: 'Tema 5: Los Consejos Insulares e IMAS', preguntes: questionsTema5Consejos },
    { id: 't15', name: 'Tema 15: Ley procedimientos', examen: 'Tema 15: Llei 39/2015 del Procediment Administratiu Comú', preguntes: questionsTema15 },
];

export const getAllTests = () => {
    return {
        tests2019,
        tests2018,
        themes
    };
};
