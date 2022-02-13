const fs = require('fs');
const jsstats = require("js-stats");
const teamsList = ["ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN","DET","GBP","HOU","IND","JAX","KCC","LAC","LAR","LVR","MIA","MIN","NEP","NOS","NYG","NYJ","PHI","PIT","SEA","SFR","TBB","TEN","WAS"]; 

const maxIterations = 100;

var gameResults = {}; //[hash]: array of 2-element arrays of [score of team with lower ID, score of team with higher ID]
var chances = {}; //chance the lower team ID will beat the higher team ID

const printRandom = (numberToPrint) => {
    let count = 0;
    let arr = [];
    for(let i = 0;i<numberToPrint;i++){
        let team1 = Math.floor(Math.random()*32);
        let team2 = Math.floor(Math.random()*32);
        if(team2==team1){
            team1--;
            if(team1<0){
                team2=1;
                team1=0;
            }
        }
       
        let c = printLine(team1,team2);
        arr.push(c);

    }
    console.log(count/numberToPrint);
    console.log(getMean(arr));
    console.log(getStddev(arr));
    printLine(6,17);
}

const printLine = (team1,team2) => {
    let c = chances[hash(team1,team2)][maxIterations];
    if(team2<team1) c = 1-c;
    c *= 100;
    console.log(teamsList[team1]+" beats "+teamsList[team2]+": "+ c.toFixed(1)+"%");
    return c;
}


//Team ID is between 0 and 31, in alphabetical order of the three letter abbreviations
const hash = (teamId1,teamId2) =>{
    let a = Math.min(teamId1,teamId2);
    let b = Math.max(teamId1,teamId2);
    return a * 32 + b;
}

//Input abbreviations
const hashAbbr = (teamCode1,teamCode2) => {
    return hash(getTeamId(teamCode1),getTeamId(teamCode2));
}

const getTeamId = (teamCode) =>{
    return teamsList.indexOf(teamCode);
}

const getMean = (arr) =>{
    var res = 0;
    arr.forEach(a=>res+=a);
    res /= arr.length;
    return res;
}

const getStddev = (arr) => {
    var mean = getMean(arr);
    var res = 0;
    arr.forEach(a=>res += Math.pow((a-mean),2));
    res /= arr.length -1;
    return Math.sqrt(res);
}


//p1: percent chance this team will beat the proxy team
//p2: percent chance the opposing team will beat the proxy team
const getWinChance = (p1,p2) => {
    if(Math.abs(p1-p2)>=0.5) return p1<p2?0:1;
    return .5 +(p1-p2);
    let res = 0;
    res += p1 * p2 /2 //if they both win against proxy, equally likely
    res += p1 * (1-p2) //if this team wins and other team loses against proxy team, then this team wins.
    //if other team wins and this team loses against proxy team, then add nothing.
    res += (1-p1) * (1-p2) /2 //if both lose, then equal chance of winning
    return res;
}

const getWinChanceThroughProxy = (teamId1, teamId2, proxy,num) => {
    let p1 = chances[hash(teamId1,proxy)][num-1];
    let p2 = chances[hash(teamId2,proxy)][num-1];
    if(teamId1>proxy) p1 = 1-p1;
    if(teamId2>proxy) p2 = 1-p2;
    return getWinChance(p1,p2);
}

const generateNextChances = (num) =>{
    //a: first team ID
    //b: second team ID
    for(let a = 0;a<32;a++){
        for(let b=a+1;b<32;b++){
            let cumulativeChance = 0;
            let count = 0;
            for(let proxy=0;proxy<32;proxy++){
               
               if(proxy==a||proxy==b) continue; //if proxy is not a or b
               if(!chances[hash(proxy,a)]||!chances[hash(proxy,b)]) continue; //no defined matchups
            
               if(!chances[hash(proxy,a)][num-1]||!chances[hash(proxy,b)][num-1]) continue; //either team is undefined against proxy in the previous round;
               //if it is a valid proxy, then calculate the chance of winning through this proxy.
                cumulativeChance += getWinChanceThroughProxy(a,b,proxy,num);
                count += 1;
            }

            //ONLY factor in previous round of this matchup if there is "0" for count;
            var times = count==0?1:count*num; //OR use count * num, to factor in a majority fraction of a time, every time.
            if(chances[hash(a,b)]&&chances[hash(a,b)][num-1]) cumulativeChance += chances[hash(a,b)][num-1] * times;
            count += times;
            
            //calculate probability
            let p = cumulativeChance / count;
            
            if(!chances[hash(a,b)]) chances[hash(a,b)] = [];

            //add probability at index "num" regardless of if there was any defined probabiliy in the previous round
            chances[hash(a,b)][num] = p; 
        }
    }

    if(num<maxIterations) generateNextChances(num+1);
    else {
        // console.log(chances[hashAbbr(team1,team2)])
        // console.log(team1 + " beats "+ team2 + ": " + chances[hashAbbr(team1,team2)][num]);
        printRandom(2000);
    }
}

const generateInitialChances = () => {
    var allHashes = Object.keys(gameResults);
    allHashes.forEach(hash=>{
        let games = gameResults[hash];
        if(!games) return;
        chances[hash] = [];
        if(games.length==1){
            //if only one data point
            chances[hash].push(games[0][0]<games[0][1]?0:1) //if the team with a lower team ID loses this game, they have a "zero percent chance" of winning against this other team
        }else{
            //if more than one game played, do a T-distribution:
            let degreesOfFreedom = games.length - 1;
            let scoreDiffs = games.map(game=>game[0]-game[1]);
            let tValue = getMean(scoreDiffs)/getStddev(scoreDiffs) //mean can be negative (lose more), but Stddev is always positive;
            let tDistribution = new jsstats.TDistribution(degreesOfFreedom);
            let p = tDistribution.cumulativeProbability(tValue);
            
            //then, with the probability "p" value, add it to "chances"
            chances[hash].push(p);
        }
    })
    generateNextChances(1);
}

const generateInitialGameResults = () => {
    fs.readFile("./storage/data.txt","utf8",(e,data)=>{
        if(e){
            console.error(e);
            return;
        }

        let lines = data.split("\n");
        lines.forEach(line=>{
            let elements = line.split(",");

            //create an array to fill with the scores, lower teamID first.
            let scores = [];
            if(getTeamId(elements[0])<getTeamId(elements[1])){
                //first team has a lower ID:
                scores.push(Number(elements[2]));
                scores.push(Number(elements[3]));
            }else{
                //second team has a lower ID:
                scores.push(Number(elements[3]));
                scores.push(Number(elements[2]));
            }

            //add the score array to the hash index of "gameResults"
            let hash = hashAbbr(elements[0],elements[1]);

            if(!gameResults[hash]) gameResults[hash] = [];
            gameResults[hash].push(scores);
            
        })

        //Then, move onto generating chances.
        generateInitialChances();
    })
}

const printMatchups = (abbr1,abbr2) => {
    console.log(gameResults[hashAbbr(abbr1,abbr2)]);
}



generateInitialGameResults();

//console.log(getWinChance(.61,.60));
