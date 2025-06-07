let runs = 0;
let wickets = 0;
let balls = 0; // Total legal balls for the innings
let target = 100;

// Extras counters
let extrasTotal = 0;
let wides = 0;
let noBalls = 0;
let byes = 0;
let legByes = 0;

// Player Data for the entire team (11 players)
let teamPlayers = [];
for (let i = 1; i <= 11; i++) {
    teamPlayers.push({
        id: i,
        name: `Player ${i}`, // Default name
        runs: 0,
        balls: 0,
        isOut: false,
        lastScores: [] // To store individual runs for undo
    });
}

// Current Batsmen at the crease
let currentBattingPlayers = []; // Will hold references to the actual player objects from teamPlayers
let strikeBatsmanIndex = 0; // 0 for the first batsman in currentBattingPlayers, 1 for the second

// Bowler data - UPDATED TO 11 BOWLERS
let bowlers = [];
for (let i = 0; i < 11; i++) { // Loop 11 times (0 to 10)
    bowlers.push({
        id: i,
        name: `Bowler ${i + 1}`, // Names from Bowler 1 to Bowler 11
        runsConceded: 0,
        wicketsTaken: 0,
        ballsBowled: 0
    });
}
let currentBowlerIndex = 0; // Index of the current bowler in the bowlers array

// --- Action History for Undo ---
// Stores objects like:
// { type: 'run', batsmanId: X, runValue: Y, ballAdded: true, bowlerId: Z }
// { type: 'dot', batsmanId: X, ballAdded: true, bowlerId: Z }
// { type: 'wicket', batsmanId: X, ballAdded: true, bowlerId: Z }
// { type: 'extra', extraType: 'wide', runValue: X, ballAdded: false, bowlerId: Z }
// { type: 'extra', extraType: 'bye', runValue: X, ballAdded: true, bowlerId: Z }
let actionHistory = [];

// --- Initial Render ---
document.addEventListener('DOMContentLoaded', initializeGame);

function initializeGame() {
    updateTotalRunsDisplay();
    updateWicketsDisplay();
    updateBallsDisplay();
    updateTargetDisplay();
    updateExtrasDisplay(); // Display extras on load
    renderPlayerSelectionList();
    renderBowlerOptions(); // Ensure bowler options reflect default names
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

function updateExtrasDisplay() {
    document.getElementById('extras_total').textContent = extrasTotal;
    document.getElementById('wides_count').textContent = wides;
    document.getElementById('noballs_count').textContent = noBalls;
    document.getElementById('byes_count').textContent = byes;
    document.getElementById('legbyes_count').textContent = legByes;
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

// Function to add a ball to the total and update displays
// isLegalDelivery: true if it counts towards bowler's over, false for wides/no-balls
function addBallToGame(isLegalDelivery = true) {
    // Only increment total innings balls if it's a legal delivery
    // Wides and No-balls are *extra* deliveries that don't count towards the legal ball count for overs.
    if (isLegalDelivery) {
        balls++; // Total legal balls for the innings
        updateBallsDisplay(); // Update display for total balls and overs

        bowlers[currentBowlerIndex].ballsBowled++; // Increments bowler's legal balls bowled
        updateBowlerStatsDisplay();

        // Check for end of over (only for legal deliveries)
        if (bowlers[currentBowlerIndex].ballsBowled % 6 === 0) {
            // Automatically switch strike at end of over
            switchStrike();
        }
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

    // Update bowler (Bowler always concedes runs scored off the bat, even if it's a no-ball/wide follow-up)
    currentBowler.runsConceded += runValue;

    // Add ball to game and bowler (this is a legal delivery if it came off the bat)
    addBallToGame(true);

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
    addBallToGame(true); // Add ball to total and bowler as a legal delivery

    updateCurrentBattingDisplay();
    updateBowlerStatsDisplay();
}


function batsmanOut() {
    if (currentBattingPlayers.length < 1) {
        alert("No batsman on strike to dismiss!");
        return;
    }
    if (wickets >= 10) {
        alert("All 10 wickets are already taken. Innings over!");
        return;
    }

    const outBatsman = currentBattingPlayers[strikeBatsmanIndex];
    const currentBowler = bowlers[currentBowlerIndex];

    actionHistory.push({
        type: 'wicket',
        batsmanId: outBatsman.id,
        ballAdded: true, // A wicket typically counts as a ball
        bowlerId: currentBowler.id
    });

    changeWickets(1); // Increment total wickets
    currentBowler.wicketsTaken++; // Bowler gets a wicket

    // Update batsman status in teamPlayers
    const teamPlayer = teamPlayers.find(p => p.id === outBatsman.id);
    if (teamPlayer) {
        teamPlayer.isOut = true;
        // The runs/balls are already updated in their object by scoring functions
        // For accurate undo, we might store their score at this exact moment in the action history
    }

    // Remove batsman from active players
    currentBattingPlayers.splice(strikeBatsmanIndex, 1);

    // Add ball to game (a wicket is a legal delivery)
    addBallToGame(true);

    // After a wicket, the next batsman (if any) comes in and takes strike
    // The previous non-striker remains at their end.
    // So, if the striker was out, the non-striker remains at index 0.
    // If the non-striker was out (e.g., run out at non-striker's end - not currently implemented),
    // the striker would remain at index 0.
    strikeBatsmanIndex = 0; // New batsman or remaining batsman is now considered index 0 for strike purposes.

    renderPlayerSelectionList(); // Re-render to show who is available
    updateCurrentBattingDisplay();
    updateBowlerStatsDisplay();

    // If only one batsman left, prompt for new batsman
    if (currentBattingPlayers.length === 1 && wickets < 10) {
        alert("One batsman out. Please select a new batsman from the 'Team Players & Selection' section.");
    } else if (currentBattingPlayers.length === 0 && wickets < 10) {
        alert("All batsmen out! Or no new batsmen available. Innings over.");
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

// --- Extra Scoring Functions ---
function addExtra(extraType, runValue, isLegalDelivery) {
    if (!currentBattingPlayers[0]) {
        alert("Please select at least one batsman before adding extras.");
        return;
    }

    const currentBowler = bowlers[currentBowlerIndex];

    // Record action for undo
    actionHistory.push({
        type: 'extra',
        extraType: extraType,
        runValue: runValue,
        ballAdded: isLegalDelivery, // Whether it counts as a legal ball for undo
        bowlerId: currentBowler.id
    });

    // Update total runs and extras specific counters
    runs += runValue;
    extrasTotal += runValue;

    switch (extraType) {
        case 'wide':
            wides += runValue; // Wide is always 1 run in this simplified model
            currentBowler.runsConceded += runValue; // Bowler concedes wide runs
            break;
        case 'noball':
            noBalls += runValue; // No-ball is always 1 run (initial) in this simplified model
            currentBowler.runsConceded += runValue; // Bowler concedes no-ball run
            break;
        case 'bye':
            byes += runValue;
            // Bowler does NOT concede bye runs
            break;
        case 'legbye':
            legByes += runValue;
            // Bowler does NOT concede leg-bye runs
            break;
    }

    // Add ball to game (only legal deliveries increment total innings balls and bowler's balls)
    addBallToGame(isLegalDelivery);

    updateTotalRunsDisplay();
    updateExtrasDisplay();
    updateBowlerStatsDisplay();
}


// --- Undo Last Action ---
function undoLastAction() {
    if (actionHistory.length === 0) {
        alert("No actions to undo.");
        return;
    }

    const lastAction = actionHistory.pop();
    const currentBowler = bowlers.find(b => b.id === lastAction.bowlerId);

    // Revert total balls and bowler's balls if applicable
    if (lastAction.ballAdded) { // This condition checks if a legal ball was recorded
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
            batsman.isOut = false; // Player is no longer out
            changeWickets(-1); // Decrement total wickets
            if (currentBowler) {
                currentBowler.wicketsTaken = Math.max(0, currentBowler.wicketsTaken - 1);
                updateBowlerStatsDisplay();
            }

            // Restore batsman to current batting players
            if (currentBattingPlayers.length < 2 && !currentBattingPlayers.includes(batsman)) {
                if (!currentBattingPlayers[0]) {
                    currentBattingPlayers.unshift(batsman); // Add to beginning (index 0)
                    strikeBatsmanIndex = 0; // New player takes strike
                } else { // Slot 1 must be empty
                    currentBattingPlayers.push(batsman); // Add to end (index 1)
                    strikeBatsmanIndex = 0; // Existing player keeps strike
                }
            } else {
                 console.warn("Undo Wicket: State might be inconsistent, manual adjustment may be needed.");
                 batsman.isOut = false; // Still mark as not out in teamPlayers
            }
        }
    } else if (lastAction.type === 'dot') {
        const batsman = teamPlayers.find(p => p.id === lastAction.batsmanId);
        if (batsman) {
            batsman.balls = Math.max(0, batsman.balls - 1); // Revert batsman's ball count
        }
    } else if (lastAction.type === 'extra') { // Handle extra undo
        runs = Math.max(0, runs - lastAction.runValue);
        extrasTotal = Math.max(0, extrasTotal - lastAction.runValue);

        switch (lastAction.extraType) {
            case 'wide':
                wides = Math.max(0, wides - lastAction.runValue);
                if (currentBowler) {
                    currentBowler.runsConceded = Math.max(0, currentBowler.runsConceded - lastAction.runValue);
                }
                break;
            case 'noball':
                noBalls = Math.max(0, noBalls - lastAction.runValue);
                if (currentBowler) {
                    currentBowler.runsConceded = Math.max(0, currentBowler.runsConceded - lastAction.runValue);
                }
                break;
            case 'bye':
                byes = Math.max(0, byes - lastAction.runValue);
                break;
            case 'legbye':
                legByes = Math.max(0, legByes - lastAction.runValue);
                break;
        }
        updateExtrasDisplay();
        updateBowlerStatsDisplay();
    }

    updateCurrentBattingDisplay();
    renderPlayerSelectionList(); // Update player list to reflect changes
    updateTotalRunsDisplay(); // Ensure total runs is updated after all undo actions
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

        const nameContainer = document.createElement('div');
        nameContainer.className = 'name-edit-container';

        const nameDisplay = document.createElement('span');
        nameDisplay.className = 'name-display';
        nameDisplay.textContent = player.name;

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'name-input';
        nameInput.value = player.name;
        nameInput.style.display = 'none'; // Hidden by default

        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.textContent = 'Edit';

        nameContainer.appendChild(nameDisplay);
        nameContainer.appendChild(nameInput);
        nameContainer.appendChild(editButton);

        playerItem.appendChild(nameContainer);

        // Event listeners for name editing
        editButton.addEventListener('click', () => {
            nameDisplay.style.display = 'none';
            nameInput.style.display = 'inline-block';
            nameInput.focus();
        });

        nameInput.addEventListener('blur', () => {
            player.name = nameInput.value.trim() || `Player ${player.id}`; // Default if empty
            nameDisplay.textContent = player.name;
            nameInput.style.display = 'none';
            nameDisplay.style.display = 'inline-block';
            updateCurrentBattingDisplay(); // Update if this player is batting
            renderBowlerOptions(); // Update bowler selection if player names are used there
        });

        nameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                nameInput.blur(); // Trigger blur to save
            }
        });

        // Add stats for out players or those who have batted
        if (player.isOut || (player.runs > 0 || player.balls > 0)) {
            const statsSpan = document.createElement('span');
            statsSpan.textContent = `(${player.runs} runs, ${player.balls} balls)`;
            playerItem.appendChild(statsSpan);
        }

        if (!currentBattingPlayers.includes(player) && !player.isOut && wickets < 10 && currentBattingPlayers.length < 2) {
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
    if (wickets >= 10) {
        alert("All 10 wickets are already taken. Innings over!");
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

    // After adding a new player, re-evaluate strikeBatsmanIndex.
    // If one batsman was at the crease, the new one comes in at the non-strike end.
    // If the striker got out, the non-striker became the striker (index 0).
    // The new batsman comes into the empty slot.
    if (currentBattingPlayers.length === 2) {
        const newPlayerIndex = currentBattingPlayers.indexOf(playerToSelect);
        strikeBatsmanIndex = (newPlayerIndex === 0) ? 1 : 0; // Existing player keeps strike by default
    } else { // Only one batsman, so they are the striker
        strikeBatsmanIndex = 0;
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
        option.textContent = bowler.name; // Use custom name
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

        const nameContainer = document.createElement('div');
        nameContainer.className = 'name-edit-container';
        nameContainer.style.width = '100%'; // Ensure it takes full width within bowler-stats

        const nameDisplay = document.createElement('h4'); // Use h4 for bowler name display
        nameDisplay.className = 'name-display';
        nameDisplay.textContent = bowler.name;

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'name-input';
        nameInput.value = bowler.name;
        nameInput.style.display = 'none'; // Hidden by default

        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.textContent = 'Edit';

        nameContainer.appendChild(nameDisplay);
        nameContainer.appendChild(nameInput);
        nameContainer.appendChild(editButton);

        bowlerDiv.appendChild(nameContainer);


        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = `
            <span>Runs: <span id="bowler_${bowler.id}_runs">${bowler.runsConceded}</span></span>
            <span>Wickets: <span id="bowler_${bowler.id}_wickets">${bowler.wicketsTaken}</span></span>
            <span>Overs: <span id="bowler_${bowler.id}_overs">${getBowlerOvers(bowler.ballsBowled)}</span></span>
        `;
        bowlerDiv.appendChild(statsDiv);
        bowlerListDiv.appendChild(bowlerDiv);

        // Event listeners for bowler name editing
        editButton.addEventListener('click', () => {
            nameDisplay.style.display = 'none';
            nameInput.style.display = 'inline-block';
            nameInput.focus();
        });

        nameInput.addEventListener('blur', () => {
            bowler.name = nameInput.value.trim() || `Bowler ${bowler.id + 1}`; // Default if empty
            nameDisplay.textContent = bowler.name;
            nameInput.style.display = 'none';
            nameDisplay.style.display = 'block'; // h4 is block-level, so make display block
            updateCurrentBowlerNameDisplay(); // Update current bowler name display
            renderBowlerOptions(); // Update bowler selection dropdown
        });

        nameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                nameInput.blur(); // Trigger blur to save
            }
        });
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
