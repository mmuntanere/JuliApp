import React, { useState } from 'react';
import { tests2019, tests2018, themes } from '../data/mockData';

const Menu = ({ onSelectTest }) => {
    const [currentMenu, setCurrentMenu] = useState('main'); // main, 2019, 2018, themes

    const renderMainMenu = () => (
        <div className="menu-list fade-in">
            <button className="btn glass-panel menu-item" onClick={() => setCurrentMenu('2019')}>
                TESTS GENERALES 2019
            </button>
            <button className="btn glass-panel menu-item" onClick={() => setCurrentMenu('2018')}>
                TESTS GENERALES 2018
            </button>
            <button className="btn glass-panel menu-item" onClick={() => setCurrentMenu('themes')}>
                TEST POR TEMA
            </button>
            <button className="btn glass-panel menu-item danger" onClick={() => window.location.reload()}>
                SALIR
            </button>
        </div>
    );

    const renderSubMenu = (items, title) => (
        <div className="menu-list fade-in">
            <h2 className="submenu-title">{title}</h2>
            <div className="submenu-grid">
                {items.map(item => (
                    <button key={item.id} className="btn glass-panel menu-item" onClick={() => onSelectTest(item)}>
                        {item.name}
                    </button>
                ))}
            </div>
            <button className="btn glass-panel menu-item back-btn" onClick={() => setCurrentMenu('main')}>
                Volver
            </button>
        </div>
    );

    return (
        <div className="menu-container">
            {currentMenu === 'main' && renderMainMenu()}
            {currentMenu === '2019' && renderSubMenu(tests2019, 'Tests Generales 2019')}
            {currentMenu === '2018' && renderSubMenu(tests2018, 'Tests Generales 2018')}
            {currentMenu === 'themes' && renderSubMenu(themes, 'Test por Tema')}
        </div>
    );
};

export default Menu;
