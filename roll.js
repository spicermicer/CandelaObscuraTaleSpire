let trackedIds = {};
let isGM = false;
let me;

function openTab(evt, tab) {
	// Declare all variables
	var i, tabcontent, tablinks;
  
	// Get all elements with class="tabcontent" and hide them
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) {
	  tabcontent[i].style.display = "none";
	}
  
	// Get all elements with class="tablinks" and remove the class "active"
	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
	  tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
  
	// Show the current tab, and add an "active" class to the button that opened the tab
	document.getElementById(tab).style.display = "block";
	evt.currentTarget.className += " active";
  }


function roll(diceName) {
		
	//Work out if guilded
	let guilded = document.getElementById(diceName).checked;
	
	let driveControl = document.getElementById(diceName + "-drive");		
	let drive = parseInt(driveControl.value || 0);
	let type = "highest";

	driveControl.value = null;
	onInputChange(driveControl);

	//Get amount of dice
	let diceCount = drive;
	for (let i = 0; i < 3; i++)
	{
		if (document.getElementById(diceName + "-" + (i + 1)).checked)
			diceCount++;
	}

	//If there's 0 dice, then we add 2 dice and take the lowest
	if (diceCount < 1)
	{
		type = "lowest";
		diceCount = 2;
	}

	console.log(diceCount);
	
	let dice = [];
	for (let i = 0; i < diceCount; i++)
	{
		if (i == 0 && guilded == true)
		{
			dice.push({name: "Guilded", roll: "D6"});
			continue;
		}
		
		dice.push({name: diceName, roll: "D6"});
	}	
	
    TS.dice.putDiceInTray(dice, true)
		.then((diceSetResponse) => {
			trackedIds[diceSetResponse] = type;
			}
		);
}

async function handleRollResult(rollEvent) {
    if (trackedIds[rollEvent.payload.rollId] == undefined) {
        //if we haven't tracked that roll, ignore it because it's not from us
		console.log("Not tracked");
        return;
    }

    if (rollEvent.kind == "rollResults") {			
        //user rolled the dice we tracked and there's a new result for us to look at
        let roll = rollEvent.payload
		let max = 0;
		let type = trackedIds[roll.rollId];
		let hasGuilded = false;


		
		//Flip max if we're checking disadvantage;
		if (type == "lowest")
			max = 999;
		
		let groups = [];
		let maxGroup = {};
        
		for (let group of roll.resultsGroups) {
			let groupSum = await TS.dice.evaluateDiceResultsGroup(group);
			
			//Keep Guilded dice
			if (group.name == "Guilded")
			{
				groups.push( group );
				hasGuilded = true;
				continue;
			}

			//Find Max
			if (type == "lowest")
			{
				if (groupSum < max) {
					max = groupSum;
					maxGroup = group;
				}
			}
			else
			{
				if (groupSum > max) {
					max = groupSum;
					maxGroup = group;
				}
			}
			
			//Find max / min
			/*
			if (trackedIds[roll.rollId] == "advantage") {
			
			} else if (trackedIds[roll.rollId] == "disadvantage") {
				if (groupSum < max) {
					max = groupSum;
					maxGroup = group;
				}
			}
			*/
        }
		
		let groupCount = roll.resultsGroups.length;
		if ((!hasGuilded && groupCount > 0) || (hasGuilded && groupCount > 1))
			groups.push(maxGroup);
		
		console.log(groups.length);

	    TS.dice.sendDiceResult(groups, roll.rollId).catch((response) => console.error("error in sending dice result", response));
		
    } else if (rollEvent.kind == "rollRemoved") {
        //if you want special handling when the user doesn't roll the dice
        delete trackedIds[rollEvent.payload.rollId];
    }
}