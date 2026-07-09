import React from "react";
import { UseSettingsReturn } from "../../../Hooks/useSettings";
import ColTwelve from "../Columns/ColTwelve";
import ColTen from "../Columns/ColTen";
import ColFifteen from "../Columns/ColFifteen";
import ColSixteen from "../Columns/ColSixteen";
import ColSeventeen from "../Columns/ColSeventeen";

// Layout functions
const Mobile = (settings: UseSettingsReturn): React.ReactElement[][] => [
    [
        <ColSeventeen
            key="col-seventeen"
            handleSelected={settings.handleSelected}
            handleButton={settings.handleButton}
            handleSwitchButton={settings.handleSwitchButton}
        />,
    ],
    [
        <ColTen
            key="col-ten"
            handleButton={settings.handleButton}
            handleSwitchButton={settings.handleSwitchButton}
            handleSelected={settings.handleSelected}
        />
    ],
    [
        <ColFifteen
            key="col-fifteen"
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            handleDatetimeInput={settings.handleDatetimeInput}
            handleButton={settings.handleButton}
        />
    ],
    [
        <ColSixteen
            key="col-sixteen"
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            handleDatetimeInput={settings.handleDatetimeInput}
            handleButton={settings.handleButton}
        />
    ],
    [
        <ColTwelve
            key="col-twelve"
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            handleButton={settings.handleButton}
        />
    ],
];

const Tablet = (settings: UseSettingsReturn): React.ReactElement[][] => [
    [
        <ColSeventeen
            key="col-seventeen"
            handleSelected={settings.handleSelected}
            handleButton={settings.handleButton}
            handleSwitchButton={settings.handleSwitchButton}
        />,
        <ColTen
            key="col-ten"
            handleButton={settings.handleButton}
            handleSwitchButton={settings.handleSwitchButton}
            handleSelected={settings.handleSelected}
        />,
    ],
    [
        <ColSixteen
            key="col-sixteen"
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            handleDatetimeInput={settings.handleDatetimeInput}
            handleButton={settings.handleButton}
        />,
        <ColFifteen
            key="col-fifteen"
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            handleDatetimeInput={settings.handleDatetimeInput}
            handleButton={settings.handleButton}
        />,
    ],
    [
        <ColTwelve
            key="col-twelve"
            handleSelected={settings.handleSelected}
            handleSwitchButton={settings.handleSwitchButton}
            handleButton={settings.handleButton}
        />
    ],

];

// Main Formation function
export default function Formation(settings: UseSettingsReturn): React.ReactElement[][][] {
    return [
        Tablet(settings),
        Tablet(settings),
        Mobile(settings),
    ];
}