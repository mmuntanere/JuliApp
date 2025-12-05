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
    { id: '2019_m1', name: 'Modelo 1', examen: 'Subalterno - Modelo 1', questions: questions2019m1.questions },
    { id: '2019_m2', name: 'Modelo 2', examen: 'Subalterno - Modelo 2', questions: questions2019m2.questions },
    { id: '2019_m3', name: 'Modelo 3', examen: 'Subalterno - Modelo 3', questions: questions2019m3.questions },
];

export const tests2018 = [
    { id: '2018_m1', name: 'Modelo 1', examen: 'Subalterno - Cuestionario A', questions: questions2018m1.questions },
    { id: '2018_m2', name: 'Modelo 2', examen: 'Subalterno - Cuestionario B', questions: questions2018m2.questions },
    { id: '2018_m3', name: 'Modelo 3', examen: 'Subalterno - Cuestionario C', questions: questions2018m3.questions },
    { id: '2018_m4', name: 'Modelo 4', examen: 'Subalterno - Cuestionario D', questions: questions2018m4.questions },
    { id: '2018_m5', name: 'Modelo 5', examen: 'Subalterno - Cuestionario E', questions: questions2018m5.questions },
];

export const themes = [
    { id: 'theme_1', name: 'Tema 1: Constitución', examen: 'Tema 1: Constitución Española 1978 - Estructura y Principios', questions: questionsTema1.questions },
    { id: 'theme_2', name: 'Tema 2: Estatut', examen: 'Tema 2: Derechos Fundamentales, TC y Reforma', questions: questionsTema2.questions },
    { id: 't4', name: 'Tema 4: Organización territorial', examen: 'Tema 4: Organización Territorial y Estatutos de Autonomía', questions: questionsTema4.questions },
    { id: 't5_est', name: 'Tema 5: Estatuto Autonomia', examen: 'Tema 5: Estatuto de Autonomía de las Illes Balears', questions: questionsTema5Estatut.questions },
    { id: 't5_cons', name: 'Tema 5: Consejos insulares', examen: 'Tema 5: Los Consejos Insulares e IMAS', questions: questionsTema5Consejos.questions },
    { id: 't15', name: 'Tema 15: Ley procedimientos', examen: 'Tema 15: Ley 39/2015 del Procedimiento Administrativo Común', questions: questionsTema15.questions },
];

export const getAllTests = () => {
    return {
        tests2019,
        tests2018,
        themes
    };
};
