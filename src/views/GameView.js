import React, { useEffect, useState } from 'react';
import GameState from '../models/GameState';
import styled from 'styled-components';
import moment from 'moment';
import icons from '../components/icons';
import { BOARD_SIDE_SIZE, ONE_SECOND } from '../lib/constants';
import { getPackageInfo } from '../lib/util';
const DEBUG = location.hostname === 'localhost';
import DEBUG_GAME from '../test/fixtures/castling1.json';
var timeInterval;

const GameView = props => {
    const gameState = new GameState();
    const [viewState, setViewState] = useState({
        gameState,
        settingsOpened: false
    });

    useEffect(() => {
        const { gameState } = viewState;
        if (DEBUG && typeof DEBUG_GAME !== 'undefined') {
            gameState.import(DEBUG_GAME);
            gameState.resume();
            props.history.push(`/game/${gameState.gameId}`);
        } else {
            gameState.initPieces();
            props.history.push(`/game/${gameState.gameId}`);
        }

        startInterval();
        window.gameState = gameState;
        setViewState({ gameState, settingsOpened: false });
        const { name, version, repository, author } = getPackageInfo();
        console.log(`${name} v${version} by ${author}`);
        console.log(`repository: ${repository}`);
    }, []);

    const startInterval = restart => {
        timeInterval = setInterval(() => {
            if (!gameState.gameEndedAt) {
                const { gameState } = viewState;
                gameState.updateTimePlayed();

                if (!restart) updateGameState(gameState);
                else setViewState({ gameState, settingsOpened: false });
            }
        }, ONE_SECOND);
    };

    const updateGameState = gameState => {
        setViewState({ ...viewState, gameState });
    };

    const handleSelect = ({ x, y, piece }) => {
        const { gameState } = viewState;
        const { selected } = gameState;
        if (selected) {
            // unselect
            if (selected.x === x && selected.y === y) {
                gameState.unselect();
                // move
            } else if (selected.piece) {
                const moved = gameState.moveSelectedPiece({ x, y });

                // select
                if (!moved) {
                    gameState.select({ x, y, piece });
                }
                // select
            } else {
                gameState.select({ x, y, piece });
            }
        } else {
            // select
            gameState.select({ x, y, piece });
        }

        // debug
        window.gameState = gameState;
        updateGameState(gameState);
    };

    const toggleSettingsMenu = settingsOpened => {
        const { gameState } = viewState;

        if (settingsOpened) {
            clearInterval(timeInterval);
            gameState.pause();
        } else {
            gameState.resume();
            startInterval('restart');
        }

        gameState.unselect();
        setViewState({ gameState, settingsOpened });
    };

    const exportGame = () => {
        const defaultFileName = `chess-${gameState.gameId}-${moment().format(
            'YYYY-MM-DD-HH-mm-ss'
        )}`;
        const fileName = prompt(
            'Enter a name for your saved game.',
            defaultFileName
        );

        if (!fileName) {
            return;
        }

        const game = gameState.export();
        const gameBlob = new Blob([game], { type: 'application/json' });
        const virtualLink = document.createElement('a');
        virtualLink.download = fileName;
        virtualLink.href = URL.createObjectURL(gameBlob);
        virtualLink.click();
    };

    const handleImportGame = () => {
        const fileInput = document.getElementById('load-file-input');
        fileInput.click();
    };

    const importGame = async event => {
        const file = event.target.files[0];
        const readFile = new FileReader();
        
        readFile.onload = e => {
            const contents = e.target.result;
            const gameToImport = JSON.parse(contents);
            gameState.import(gameToImport);
            updateGameState(gameState);
            startInterval('restart');
        };
        readFile.readAsText(file);
    };

    const renderPieceIcon = ({ type, player }) => {
        if (!type) {
            return null;
        }

        const Icon = icons[type];

        if (Icon) {
            return (
                <IconContainer title={type}>
                    <Icon
                        color1={player ? 'black' : 'white'}
                        color2={player ? 'white' : 'black'}
                    />
                </IconContainer>
            );
        }

        return type;
    };

    const renderGameStats = () => {
        const { gameState } = viewState;
        return (
            <GameStats>
                <CurrentPlayer player={gameState.currentPlayer}>
                   PLAY {gameState.currentPlayer ? 'Black' : 'White'}
                </CurrentPlayer>
                <CurrentTurn>MOVE <br/>#{String(gameState.currentTurn + 1)}</CurrentTurn>
                <TimePlayed>
                   TIME <br/>{gameState.totalTimePlayed.format('hh:mm:ss', {
                        trim: false
                    })}
                </TimePlayed>
                <OpenSettings
                    open={viewState.settingsOpened}
                    onClick={() =>
                        toggleSettingsMenu(!viewState.settingsOpened)
                    }
                >
                <i class="fa fa-sort-desc" style={{height: "32px" ,width: "32px",fontSize: "24px"}}></i>
                </OpenSettings>
            </GameStats>
        );
    };

    const renderSettingsMenu = () => {
        if (viewState.settingsOpened) {
            return (
                <div>
                    <SettingsMenuAnchor>
                        <SettingsMenu>
                            <SettingsItem>
                                <span>White:</span> Human
                            </SettingsItem>
                            <SettingsItem>
                                <span>Black:</span> Human
                            </SettingsItem>
                            <SettingsItem>
                                <span>Time limit:</span> None
                            </SettingsItem>
                            <SettingsItem>
                                <span>Offline:</span> Disabled
                            </SettingsItem>
                            <SettingsItem onClick={exportGame}>
                                <span>Save:</span> &gt;&gt;
                            </SettingsItem>
                            <SettingsItem onClick={handleImportGame}>
                                <span>Load:</span> &lt;&lt;
                            </SettingsItem>
                        </SettingsMenu>
                    </SettingsMenuAnchor>
                    <HiddenFileLoader onChange={importGame} />
                </div>
            );
        }

        return null;
    };

    const renderGraveyard = player => {
        const { gameState } = viewState;
        return gameState.removedPieces[player].map(piece => (
            <Tomb key={piece.id}>{renderPieceIcon(piece)}</Tomb>
        ));
    };

    const renderSquares = () => {
        const { gameState } = viewState;
        let squares = [];
        for (let y = 0; y <= BOARD_SIDE_SIZE + 2; y++) {
            for (let x = 0; x <= BOARD_SIDE_SIZE + 2; x++) {
                // corners
                if (
                    (x === 0 && y === 0) ||
                    (x === BOARD_SIDE_SIZE + 2 && y === BOARD_SIDE_SIZE + 2) ||
                    (x === BOARD_SIDE_SIZE + 2 && y === 0) ||
                    (x === 0 && y === BOARD_SIDE_SIZE + 2)
                ) {
                    squares.push(<Side key={`${x}-${y}`} />);
                    // first column
                } else if (x === 0) {
                    squares.push(
                        <Side key={`${x}-${y}`} border="right">
                            {/* {BOARD_SIDE_SIZE + 2 - y} */}
                        </Side>
                    );
                    // last column
                } else if (x === BOARD_SIDE_SIZE + 2) {
                    squares.push(
                        <Side key={`${x}-${y}`} border="left">
                            {/* {BOARD_SIDE_SIZE + 2 - y} */}
                        </Side>
                    );
                    // first row
                } else if (y === 0) {
                    squares.push(
                        <Side key={`${x}-${y}`} border="bottom">
                            {/* {String.fromCharCode(96 + x)} */}
                        </Side>
                    );
                    // last row
                } else if (y === BOARD_SIDE_SIZE + 2) {
                    squares.push(
                        <Side key={`${x}-${y}`} border="top">
                            {/* {String.fromCharCode(96 + x)} */}
                        </Side>
                    );
                    // everything else
                } else {
                    const adjustedX = x - 1;
                    const adjustedY = y - 1;
                    const piece = gameState.getPieceAt({
                        x: adjustedX,
                        y: adjustedY
                    });
                    squares.push(
                        <Square
                            key={`${x}-${y}`}
                            even={(x + y) % 2 === 0}
                            player={piece && piece.player}
                            onClick={() =>
                                handleSelect({
                                    x: adjustedX,
                                    y: adjustedY,
                                    piece
                                })
                            }
                            selected={gameState.isSelectedSquare({
                                x: adjustedX,
                                y: adjustedY
                            })}
                        >
                            {renderPieceIcon({ ...piece })}
                        </Square>
                    );
                }
            }
        }

        return squares;
    };

    return (
        <View>
            {renderGameStats()}
            {renderSettingsMenu()}
            <Wrapper>
                <Graveyard>{renderGraveyard(0)}</Graveyard>
                <Board>{renderSquares()}</Board>
                <Graveyard>{renderGraveyard(1)}</Graveyard>
            </Wrapper>
        </View>
    );
};

// Styling for Div ------------------>

const View = styled.div`
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    user-select: none;
    color: ${props => props.theme.color1};
`;

const GameStats = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    flex-wrap: wrap;
    margin: 10px;
    padding: 18px;
    border-radius: 5px;
    background: ${props => props.theme.background2};
    color: ${props => props.theme.color2};
    min-height: 40px;
    box-sizing: border-box;
    font-size: 14px;
    border: 2px solid #56290e;

`;

const CurrentTurn = styled.div`
    margin-right: 20px;
    font-weight: bold;
`;

const CurrentPlayer = styled.div`
    text-transform: uppercase;
    font-weight: bold;
    color: ${props => (props.player ? 'black' : 'white')};
    width: 60px;
    margin-right: 20px;
`;

const TimePlayed = styled.div`
font-weight: bold;
`;

const OpenSettings = styled.div`
    font-size: 14px;
    margin-left: 10px;
    box-sizing: border-box;
    cursor:pointer;
    ${props =>
        props.open &&
        `
        margin: -1px;
        margin-left: 9px;
        border: 1px inset white;
        `};
`;

const SettingsMenuAnchor = styled.div`
    margin-left: -80px;
`;

const SettingsMenu = styled.div`
    width: 160px;
    position: absolute;
    margin-top: -10px;
    background: ${props => props.theme.background2};
    color: ${props => props.theme.color2};
    border: 1px solid black;
`;

const SettingsItem = styled.div`
    display: flex;
    justify-content: space-between;
    border: 1px solid #dca763; 
    padding: 8px;
    }

`;

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const Graveyard = styled.div`
    width: 95%;
    display: flex;
    flex-wrap: wrap;
    height: 4vw;
    background: rgb(86, 40, 15);
    padding: 10px;
    border: 1px solid black;

    @media screen and (orientation: landscape) {
        height: 4vh;
    }
`;

const Tomb = styled.div`
    width: 4vw;

    @media screen and (orientation: landscape) {
        width: 4vh;
    }
`;

const Board = styled.div`
    display: grid;
    grid-template: repeat(10, calc(80vw / 10)) / repeat(10, calc(80vw / 10));
    cursor: pointer;

    @media screen and (orientation: landscape) {
        grid-template:
            repeat(10, calc((80vh - 5rem) / 10)) /
            repeat(10, calc((80vh - 5rem) / 10));
    }
`;

const Square = styled.div`
    background: ${props =>
        props.selected
            ? 'green'
            : props.even
            ? props.theme.evenSquareBackground
            : props.theme.oddSquareBackground};
    color: ${props => (props.player ? 'black' : 'white')};
    text-shadow: 0 0 2px ${props => (props.player ? 'white' : 'black')};
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
`;

const Side = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    ${props =>
        props.border ? `border-${props.border}: 1px solid black;` : null}
    font-size: 14px;
`;

const IconContainer = styled.div`
    svg {
        width: 100%;
        height: 100%;
    }
`;

const HiddenFileLoader = styled.input.attrs({
    type: 'file',
    id: 'load-file-input'
})`
    display: none;
`;

export default GameView;
 