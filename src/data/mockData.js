import { questions2019m1 } from './tests/2019_model1';
import { questions2019m2 } from './tests/2019_model2';
import { questions2019m3 } from './tests/2019_model3';
import { questions2018m1 } from './tests/2018_model1';

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
    { id: '2018_m2', name: 'Modelo 2', examen: 'Test General 2018 - Modelo 2', preguntes: generateQuestions(60, 'Modelo 2 2018') },
    { id: '2018_m3', name: 'Modelo 3', examen: 'Test General 2018 - Modelo 3', preguntes: generateQuestions(60, 'Modelo 3 2018') },
    { id: '2018_m4', name: 'Modelo 4', examen: 'Test General 2018 - Modelo 4', preguntes: generateQuestions(60, 'Modelo 4 2018') },
    { id: '2018_m5', name: 'Modelo 5', examen: 'Test General 2018 - Modelo 5', preguntes: generateQuestions(60, 'Modelo 5 2018') },
];

export const themes = [
    { id: 't1', name: 'Tema 1: Constitución', examen: 'Tema 1: Constitución', preguntes: generateQuestions(60, 'Constitución') },
    { id: 't2', name: 'Tema 2: Derechos y deberes', examen: 'Tema 2: Derechos y deberes', preguntes: generateQuestions(60, 'Derechos y deberes') },
    { id: 't4', name: 'Tema 4: Organización territorial', examen: 'Tema 4: Organización territorial', preguntes: generateQuestions(60, 'Organización territorial') },
    { id: 't5_est', name: 'Tema 5: Estatuto Autonomia', examen: 'Tema 5: Estatuto Autonomia', preguntes: generateQuestions(60, 'Estatuto Autonomia') },
    { id: 't5_cons', name: 'Tema 5: Consejos insulares', examen: 'Tema 5: Consejos insulares', preguntes: generateQuestions(60, 'Consejos insulares') },
    { id: 't15', name: 'Tema 15: Ley procedimientos', examen: 'Tema 15: Ley procedimientos', preguntes: generateQuestions(60, 'Ley procedimientos') },
];

export const getAllTests = () => {
    return {
        tests2019,
        tests2018,
        themes
    };
};
