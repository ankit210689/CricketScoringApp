let runs = 0;
let wickets = 0;
let balls = 0; // Total balls for the innings
let target = 100;

// Player Data for the entire team (11 players)
let teamPlayers = [];
for (let i = 1; i <= 11; i++) {
    teamPlayers.push({
        id: i,
        name: `Player ${i}`,
        runs: 0,
        balls: 0,
        isOut: false,
        lastScores: [] // To store individual runs for undo
    });
}

// Current Batsmen at the crease
let currentBattingPlayers = []; // Will hold references to the actual player objects from teamPlayers
let strikeBatsmanIndex = 0; // 0 for the first batsman in currentBattingPlayers, 1 for the second

// Bowler data
let bowlers = [
  { id: 0, name: 'Bowler 1', runsConceded: 0, wicketsTaken: 0, ballsBowled: 0 },
  { id: 1, name: 'Bowler 2', runsConceded: 0, wicketsTaken: 0, ballsBowled: 0 },
  { id: 2, name: 'Bowler 3', runsConceded: 0, wicketsTaken: 0, ballsBowled: 0 },
  { id: 3, name: 'Bowler 4', runsConceded: 0, wicketsTaken: 0, ballsBowled: 0 },
  { id: 4, name: 'Bowler 5', runsConceded: 0, wicketsTaken: 0, ballsBowled: 0 }
];
let currentBowlerIndex = 0; // Index of the current bowler in the bowlers array

// --- Action History for Undo ---
let actionHistory = []; // Stores objects like { type: 'run', batsmanId: X, runValue: Y, ballAdded: true, bowlerId: Z }

// --- Initial Render ---
document.addEventListener('DOMContentLoaded', initializeGame);

function initializeGame() {
    updateTotalRunsDisplay();
    updateWicketsDisplay();
    updateBallsDisplay();
    updateTargetDisplay();
    renderPlayerSelectionList();
    renderBowlerOptions();
    generateBowlerStatsDisplay();
    updateCurrentBowlerNameDisplay();
    updateCurrentBattingDisplay(); // Initialize with "No Batsman Selected"
}

// --- Display Update Functions ---
function updateTotalRunsDisplay() {
    document.getElementById('runs').textContent = runs;
}

function updateWicketsDisplay() {
    document.getElementById('wickets').textContent = wickets;
}

function updateBallsDisplay() {
    document.getElementById('balls').textContent = balls;
    let overs = Math.floor(balls / 6);
    let extraBalls = balls % 6;
    document.getElementById('overs').textContent = `${overs}.${extraBalls}`;
}

function updateTargetDisplay() {
    document.getElementById('target').textContent = target;
}

function updateCurrentBattingDisplay() {
    const batsman1Div = document.getElementById('active-batsman-1');
    const batsman2Div = document.getElementById('active-batsman-2');
    const onStrikeSpan = document.getElementById('on_strike');

    if (currentBattingPlayers[0]) {
        batsman1Div.innerHTML = `<h3>${currentBattingPlayers[0].name}</h3><p>Runs: ${currentBattingPlayers[0].runs} (${currentBattingPlayers[0].balls})</p>`;
        batsman1Div.classList.toggle('on-strike-highlight', strikeBatsmanIndex === 0);
    } else {
        batsman1Div.innerHTML = `<h3>No Batsman Selected</h3><p>Runs: 0 (0)</p>`;
        batsman1Div.classList.remove('on-strike-highlight');
    }

    if (currentBattingPlayers[1]) {
        batsman2Div.innerHTML = `<h3>${currentBattingPlayers[1].name}</h3><p>Runs: ${currentBattingPlayers[1].runs} (${currentBattingPlayers[1].balls})</p>`;
        batsman2Div.classList.toggle('on-strike-highlight', strikeBatsmanIndex === 1);
    } else {
        batsman2Div.innerHTML = `<h3>No Batsman Selected</h3><p>Runs: 0 (0)</p>`;
        batsman2Div.classList.remove('on-strike-highlight');
    }

    onStrikeSpan.textContent = currentBattingPlayers[strikeBatsmanIndex] ? currentBattingPlayers[strikeBatsmanIndex].name : 'N/A';
}


// --- General Scoring Functions ---

function changeWickets(val) {
  wickets = Math.min(10, Math.max(0, wickets + val));
  updateWicketsDisplay();
}

function changeTarget(val) {
  target = Math.max(0, target + val);
  updateTargetDisplay();
}

// --- Ball & Run Logic (Consolidated) ---
function addBallToGame() {
    balls++;
    updateBallsDisplay();
    // Add ball to current bowler
    bowlers[currentBowlerIndex].ballsBowled++;
    updateBowlerStatsDisplay();

    // Check for end of over
    if (balls % 6 === 0) {
        // Automatically switch strike at end of over
        switchStrike();
    }
}

function scoreRuns() {
    if (currentBattingPlayers.length < 2) {
        alert("Please select two batsmen before scoring runs.");
        return;
    }

    const runValue = parseInt(document.getElementById('run_selector').value);
    const currentBatsman = currentBattingPlayers[strikeBatsmanIndex];
    const currentBowler = bowlers[currentBowlerIndex];

    // Record action for undo
    actionHistory.push({
        type: 'run',
        batsmanId: currentBatsman.id,
        runValue: runValue,
        ballAdded: true, // A legal delivery
        bowlerId: currentBowler.id
    });

    // Update batsman
    currentBatsman.runs += runValue;
    currentBatsman.balls++;
    currentBatsman.lastScores.push(runValue); // For granular undo for batsman

    // Update total runs
    runs += runValue;
    updateTotalRunsDisplay();

    // Update bowler
    currentBowler.runsConceded += runValue;

    // Add ball to game and bowler
    addBallToGame();

    updateCurrentBattingDisplay();
    updateBowlerStatsDisplay();

    // Rotate strike if odd runs
    if (runValue % 2 !== 0) {
        switchStrike();
    }
}

function addDotBall() {
    if (currentBattingPlayers.length < 2) {
        alert("Please select two batsmen before adding a dot ball.");
        return;
    }
    const currentBatsman = currentBattingPlayers[strikeBatsmanIndex];
    const currentBowler = bowlers[currentBowlerIndex];

    actionHistory.push({
        type: 'dot',
        batsmanId: currentBatsman.id,
        ballAdded: true,
        bowlerId: currentBowler.id
    });

    currentBatsman.balls++; // Batsman faces a ball
    addBallToGame(); // Add ball to total and bowler

    updateCurrentBattingDisplay();
    updateBowlerStatsDisplay();
}


function batsmanOut() {
    if (currentBattingPlayers.length < 1) {
        alert("No batsman on strike to dismiss!");
        return;
    }

    const outBatsman = currentBattingPlayers[strikeBatsmanIndex];
    const currentBowler = bowlers[currentBowlerIndex];

    actionHistory.push({
        type: 'wicket',
        batsmanId: outBatsman.id,
        runValue: outBatsman.runs - outBatsman.lastScores.reduce((a, b) => a + b, 0), // Calculate runs before this wicket, but not really relevant for simple undo
        ballAdded: true,
        bowlerId: currentBowler.id
    });

    changeWickets(1); // Increment total wickets
    currentBowler.wicketsTaken++; // Bowler gets a wicket

    // Update batsman status in teamPlayers
    const teamPlayer = teamPlayers.find(p => p.id === outBatsman.id);
    if (teamPlayer) {
        teamPlayer.isOut = true;
        teamPlayer.runs = outBatsman.runs; // Save their final score
        teamPlayer.balls = outBatsman.balls; // Save their final balls
    }

    // Remove batsman from active players
    currentBattingPlayers.splice(strikeBatsmanIndex, 1);

    // Add ball to game (a wicket is a legal delivery)
    addBallToGame();

    // Reset strike index if the first batsman was out
    if (strikeBatsmanIndex === 0 && currentBattingPlayers.length === 1) {
        strikeBatsmanIndex = 0; // The remaining batsman is now at index 0
    } else if (currentBattingPlayers.length === 0) {
        // All out or no batsmen left
        strikeBatsmanIndex = 0; // Reset
        alert("All out! Or no batsmen left to bat. Game Over?");
    }

    renderPlayerSelectionList(); // Re-render to show who is available
    updateCurrentBattingDisplay();
    updateBowlerStatsDisplay();

    // If only one batsman left, prompt for new batsman
    if (currentBattingPlayers.length === 1 && wickets < 10) {
        alert("One batsman out. Please select a new batsman from the 'Team Players' section.");
    }
}


function switchStrike() {
    if (currentBattingPlayers.length === 2) {
        strikeBatsmanIndex = (strikeBatsmanIndex === 0) ? 1 : 0;
        updateCurrentBattingDisplay();
    } else {
        alert("Cannot switch strike with less than two batsmen at the crease.");
    }
}

// --- Undo Last Action ---
function undoLastAction() {
    if (actionHistory.length === 0) {
        alert("No actions to undo.");
        return;
    }

    const lastAction = actionHistory.pop();
    const currentBowler = bowlers.find(b => b.id === lastAction.bowlerId);

    // Revert total balls
    if (lastAction.ballAdded) {
        balls = Math.max(0, balls - 1);
        updateBallsDisplay();
        if (currentBowler) {
            currentBowler.ballsBowled = Math.max(0, currentBowler.ballsBowled - 1);
            updateBowlerStatsDisplay();
        }
    }

    if (lastAction.type === 'run') {
        const batsman = teamPlayers.find(p => p.id === lastAction.batsmanId); // Find original player object
        if (batsman) {
            // Revert batsman's runs and balls
            batsman.runs = Math.max(0, batsman.runs - lastAction.runValue);
            batsman.balls = Math.max(0, batsman.balls - 1);
            if (batsman.lastScores.length > 0) {
                batsman.lastScores.pop(); // Remove the last recorded run
            }
            // Revert total runs
            runs = Math.max(0, runs - lastAction.runValue);
            updateTotalRunsDisplay();
            // Revert bowler's runs
            if (currentBowler) {
                currentBowler.runsConceded = Math.max(0, currentBowler.runsConceded - lastAction.runValue);
                updateBowlerStatsDisplay();
            }
        }
    } else if (lastAction.type === 'wicket') {
        const batsman = teamPlayers.find(p => p.id === lastAction.batsmanId);
        if (batsman) {
            // Revert wicket status for the player
            batsman.isOut = false;
            // Place batsman back if there's an empty slot and less than 10 wickets
            if (currentBattingPlayers.length < 2 && wickets < 10) {
                 // Try to put them back in the most logical position (usually first slot if empty)
                if (!currentBattingPlayers[0]) {
                    currentBattingPlayers[0] = batsman;
                    strikeBatsmanIndex = 0;
                } else if (!currentBattingPlayers[1]) {
                    currentBattingPlayers[1] = batsman;
                    strikeBatsmanIndex = 1; // Assuming they come back on non-strike
                } else {
                    // This case means 2 batsmen are already there, which shouldn't happen after a wicket undo.
                    // This scenario is complex and might need more advanced game state management.
                    // For now, we'll just put them back into teamPlayers.
                }
            }
            changeWickets(-1); // Decrement total wickets
            if (currentBowler) {
                currentBowler.wicketsTaken = Math.max(0, currentBowler.wicketsTaken - 1);
                updateBowlerStatsDisplay();
            }
        }
    } else if (lastAction.type === 'dot') {
        const batsman = teamPlayers.find(p => p.id === lastAction.batsmanId);
        if (batsman) {
            batsman.balls = Math.max(0, batsman.balls - 1); // Revert batsman's ball count
        }
    }

    updateCurrentBattingDisplay();
    renderPlayerSelectionList(); // Update player list to reflect changes
}


// --- Player Selection Functions ---

function renderPlayerSelectionList() {
    const listDiv = document.getElementById('player-selection-list');
    listDiv.innerHTML = ''; // Clear existing list

    teamPlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';

        if (currentBattingPlayers.includes(player)) {
            playerItem.classList.add('selected');
        }
        if (player.isOut) {
            playerItem.classList.add('out');
        }

        playerItem.innerHTML = `<span>${player.name}</span>`;

        // Add stats for out players or those who have batted
        if (player.isOut || (player.runs > 0 || player.balls > 0)) {
            const statsSpan = document.createElement('span');
            statsSpan.textContent = `(${player.runs} runs, ${player.balls} balls)`;
            playerItem.appendChild(statsSpan);
        }


        if (!currentBattingPlayers.includes(player) && !player.isOut) {
            const selectButton = document.createElement('button');
            selectButton.textContent = 'Send to Bat';
            selectButton.onclick = () => selectPlayerForBatting(player.id);
            playerItem.appendChild(selectButton);
        } else if (player.isOut) {
            const outStatus = document.createElement('span');
            outStatus.textContent = ' (Out)';
            playerItem.appendChild(outStatus);
        } else if (currentBattingPlayers.includes(player)) {
            const statusSpan = document.createElement('span');
            statusSpan.textContent = ' (Batting)';
            playerItem.appendChild(statusSpan);
        }

        listDiv.appendChild(playerItem);
    });
}

function selectPlayerForBatting(playerId) {
    if (currentBattingPlayers.length >= 2) {
        alert("Two batsmen are already at the crease. A batsman must get out before a new one can come in.");
        return;
    }

    const playerToSelect = teamPlayers.find(p => p.id === playerId);

    if (!playerToSelect || playerToSelect.isOut) {
        alert("This player is already out or invalid.");
        return;
    }

    if (currentBattingPlayers.includes(playerToSelect)) {
        alert("This player is already batting.");
        return;
    }

    currentBattingPlayers.push(playerToSelect);
    playerToSelect.isOut = false; // Ensure they are not marked as out if coming back from undo

    // Set strike if this is the first batsman, otherwise default to non-strike (for the second batsman)
    if (currentBattingPlayers.length === 1) {
        strikeBatsmanIndex = 0;
    } else if (currentBattingPlayers.length === 2) {
        // If the first batsman is at index 0, the new one goes to index 1 and is non-striker
        // If the first batsman was at index 1 (meaning 0 was empty), the new one goes to 0
        if (!currentBattingPlayers[0]) { // If slot 0 was empty
            currentBattingPlayers.reverse(); // Move new player to 0, existing to 1
            strikeBatsmanIndex = 0; // Assume new batsman takes strike for now
        } else {
            strikeBatsmanIndex = 0; // Default to existing batsman on strike
        }
    }

    updateCurrentBattingDisplay();
    renderPlayerSelectionList();
}


// --- Bowler Specific Functions ---

function renderBowlerOptions() {
    const select = document.getElementById('current_bowler_select');
    select.innerHTML = '';
    bowlers.forEach((bowler, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = bowler.name;
        select.appendChild(option);
    });
    // Set initial selection
    select.value = currentBowlerIndex;
}

function generateBowlerStatsDisplay() {
    const bowlerListDiv = document.getElementById('bowler-list');
    bowlerListDiv.innerHTML = ''; // Clear existing content

    bowlers.forEach((bowler, index) => {
        const bowlerDiv = document.createElement('div');
        bowlerDiv.className = 'bowler-stats';
        bowlerDiv.id = `bowler_${bowler.id}`; // Add an ID for easy updating

        const nameH4 = document.createElement('h4');
        nameH4.textContent = bowler.name;
        bowlerDiv.appendChild(nameH4);

        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = `
            <span>Runs: <span id="bowler_${bowler.id}_runs">${bowler.runsConceded}</span></span>
            <span>Wickets: <span id="bowler_${bowler.id}_wickets">${bowler.wicketsTaken}</span></span>
            <span>Overs: <span id="bowler_${bowler.id}_overs">${getBowlerOvers(bowler.ballsBowled)}</span></span>
        `;
        bowlerDiv.appendChild(statsDiv);
        bowlerListDiv.appendChild(bowlerDiv);
    });
}

function updateBowlerStatsDisplay() {
    bowlers.forEach(bowler => {
        document.getElementById(`bowler_${bowler.id}_runs`).textContent = bowler.runsConceded;
        document.getElementById(`bowler_${bowler.id}_wickets`).textContent = bowler.wicketsTaken;
        document.getElementById(`bowler_${bowler.id}_overs`).textContent = getBowlerOvers(bowler.ballsBowled);
    });
}

function getBowlerOvers(balls) {
    const overs = Math.floor(balls / 6);
    const extraBalls = balls % 6;
    return `${overs}.${extraBalls}`;
}

function updateCurrentBowler() {
    currentBowlerIndex = parseInt(document.getElementById('current_bowler_select').value);
    updateCurrentBowlerNameDisplay();
}

function updateCurrentBowlerNameDisplay() {
    document.getElementById('current_bowler_name').textContent = bowlers[currentBowlerIndex].name;
}