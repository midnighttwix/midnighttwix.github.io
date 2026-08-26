/* Pokemon Fantasy Football - static league data, name banks and flavor text. */

const NFL_TEAMS = [
  { abbr: "DEN", city: "Denver", nick: "Broncocos", c1: "#FB4F14", c2: "#002244" },
  { abbr: "BAL", city: "Baltimore", nick: "Bravians", c1: "#241773", c2: "#9E7C0C" },
  { abbr: "PIT", city: "Pittsburgh", nick: "Steelix", c1: "#FFB612", c2: "#101820" },
  { abbr: "KC", city: "Kansas City", nick: "Bayleefs", c1: "#E31837", c2: "#FFB81C" },
  { abbr: "PHI", city: "Philadelphia", nick: "Beedrills", c1: "#004C54", c2: "#A5ACAF" },
  { abbr: "NYC", city: "New York", nick: "Charcadets", c1: "#125740", c2: "#F0F0F0" },
  { abbr: "SEA", city: "Seattle", nick: "Sawks", c1: "#002244", c2: "#69BE28" },
  { abbr: "LAC", city: "Los Angeles", nick: "Charjabugs", c1: "#0080C6", c2: "#FFC20E" },
  { abbr: "BUF", city: "Bouffalant", nick: "Bills", c1: "#00338D", c2: "#C60C30" },
  { abbr: "DET", city: "Detroit", nick: "Solgalions", c1: "#0076B6", c2: "#B0B7BC" },
  { abbr: "MIN", city: "Minnesota", nick: "Seakings", c1: "#4F2683", c2: "#FFC62F" },
  { abbr: "CLE", city: "Cleveland", nick: "Grounds", c1: "#311D00", c2: "#FF3C00" },
  { abbr: "TB", city: "Tampa Bay", nick: "Mukaneers", c1: "#D50A0A", c2: "#34302B" },
  { abbr: "LAR", city: "Los Angeles", nick: "Reshirams", c1: "#003594", c2: "#FFA300" },
  { abbr: "HOU", city: "Houston", nick: "Ekans", c1: "#03202F", c2: "#A71930" },
  { abbr: "GB", city: "Green Bay", nick: "Naclstackers", c1: "#203731", c2: "#FFB612" },
  { abbr: "DAL", city: "Dallas", nick: "Chouboys", c1: "#041E42", c2: "#869397" },
  { abbr: "SF", city: "San Francisco", nick: "49Tales", c1: "#AA0000", c2: "#B3995D" },
  { abbr: "CHI", city: "Chicago", nick: "Beartics", c1: "#0B162A", c2: "#C83803" },
  { abbr: "ATL", city: "Atlanta", nick: "Fennekins", c1: "#A71930", c2: "#101820" },
  { abbr: "MIA", city: "Miami", nick: "Palafins", c1: "#008E97", c2: "#FC4C02" },
  { abbr: "NYT", city: "New York", nick: "Tyrunts", c1: "#0B2265", c2: "#A71930" },
  { abbr: "NO", city: "New Orleans", nick: "Masqueraints", c1: "#D3BC8D", c2: "#101820" },
  { abbr: "ARI", city: "Arizona", nick: "Carkols", c1: "#97233F", c2: "#101820" },
  { abbr: "NE", city: "New England", nick: "Patrats", c1: "#002244", c2: "#C60C30" },
  { abbr: "CIN", city: "Cincinnati", nick: "Tangels", c1: "#FB4F14", c2: "#101820" },
  { abbr: "WAS", city: "Washington", nick: "Charmanders", c1: "#5A1414", c2: "#FFB612" },
  { abbr: "IND", city: "Indianapolis", nick: "Volts", c1: "#002C5F", c2: "#A2AAAD" },
  { abbr: "JAX", city: "Jacksonville", nick: "Scraguars", c1: "#006778", c2: "#D7A22A" },
  { abbr: "LV", city: "Las Vegas", nick: "Doubladers", c1: "#101820", c2: "#A5ACAF" },
  { abbr: "TEN", city: "Tennessee", nick: "Cetitans", c1: "#0C2340", c2: "#4B92DB" },
  { abbr: "CAR", city: "Carolina", nick: "Stantlers", c1: "#0085CA", c2: "#101820" },
];

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

/* Yahoo default scoring (0.5 PPR toggle handled by settings). */
const SCORING = {
  passYd: 0.04,
  passTd: 4,
  interception: -1,
  rushYd: 0.1,
  rushTd: 6,
  recYd: 0.1,
  recTd: 6,
  fumbleLost: -2,
  twoPt: 2,
  xp: 1,
  fg0: 3,
  fg20: 3,
  fg30: 3,
  fg40: 4,
  fg50: 5,
  fgMiss: 0,
  defSack: 1,
  defInt: 2,
  defFumble: 2,
  defTd: 6,
  defSafety: 2,
  defBlock: 2,
};

const PA_TIERS = [
  { max: 0, pts: 10 },
  { max: 6, pts: 7 },
  { max: 13, pts: 4 },
  { max: 20, pts: 1 },
  { max: 27, pts: 0 },
  { max: 34, pts: -1 },
  { max: 999, pts: -4 },
];

const ROSTER_SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"];
const FLEX_OK = ["RB", "WR", "TE"];
const NORMAL_BENCH_SIZE = 6;
const DYNASTY_BENCH_SIZE = 20;
let BENCH_SIZE = NORMAL_BENCH_SIZE;
let ROSTER_SIZE = ROSTER_SLOTS.length + BENCH_SIZE;

/* Dynasty leagues carry way deeper benches since rosters persist year to year. */
function applyRosterSizeForMode(mode) {
  BENCH_SIZE = mode === "dynasty" ? DYNASTY_BENCH_SIZE : NORMAL_BENCH_SIZE;
  ROSTER_SIZE = ROSTER_SLOTS.length + BENCH_SIZE;
}

const REG_SEASON_WEEKS = 14;
const NFL_WEEKS = 17;
const BYE_WEEKS = [5, 6, 7, 8, 9, 10, 11, 12];

const FIRST_NAMES = [
  "Aaron", "Adam", "Alvin", "Amari", "Andrew", "Andy", "Anthony", "Antonio", "Austin", "Bailey",
  "Baker", "Barry", "Ben", "Bijan", "Blake", "Brandon", "Braxton", "Braylon", "Breece", "Brock",
  "Bryce", "Calvin", "Cam", "Carson", "Case", "CeeDee", "Chris", "Christian", "Colt", "Colton",
  "Cooper", "Corey", "Courtland", "Dak", "Dan", "Daniel", "Darius", "Davante", "Davis", "Dawson",
  "DeAndre", "Deebo", "Deonte", "Derek", "Derrick", "Deshaun", "Desmond", "Devonta", "Dontae", "Dorian",
  "Drew", "Elias", "Elijah", "Eli", "Emmitt", "Eric", "Everett", "Ezekiel", "Gage", "Gardner",
  "Geno", "Golden", "Grayson", "Herman", "Hudson", "Isaiah", "Isiah", "Jacoby", "Jaelen", "Jalen",
  "Jamal", "Jared", "Javonte", "Jaxon", "Jaylen", "Jaylin", "Jerry", "Jim", "Jimmy", "Joe",
  "Jonathan", "Josh", "Josiah", "Julio", "Justin", "Kaden", "Kareem", "Keenan", "Kenny", "Kingston",
  "Kirk", "Kobe", "Kyler", "Lamar", "Larry", "Ledger", "Le'Veon", "Mac", "Maddox", "Malachi",
  "Malik", "Marcus", "Marquise", "Marshall", "Mason", "Matt", "Matthew", "Maverick", "Melvin", "Michael",
  "Mike", "Miles", "Najee", "Nick", "Nolan", "Odell", "Patrick", "Peyton", "Philip", "Rachaad",
  "Randy", "Rashad", "Reggie", "Rhamondre", "Robert", "Rowan", "Russell", "Ryan", "Ryder", "Sam",
  "Sawyer", "Saquon", "Stefon", "Tanner", "Tavon", "Tee", "Teddy", "Terry", "Tom", "Tony",
  "Torry", "Travis", "Trevon", "Trevor", "Trey", "Tua", "Tyreek", "Tyrese", "Walter", "Weston",
  "Will", "Wyatt", "Xavier", "Zach", "Zamir", "Doug", "Kurt", "Sauce", "Poncho", "Moses", "Swarley",
  "Eugene", "Eustace", "Carl", "Bazinga", "Shabooya", "Dinkleburg", "Timmy", "Bobby", "Babu", "Randy",
  "Frostee", "Boogy", "Lucky", "DeMarvion", "Ziggy", "JuJu", "Spyro", "Crash", "Link", "Roy", "Big",
  "Jet", "Shadow", "Sonic", "Chugg", "The Shell Of", "3 Rats Pretending To Be",
  "Donk", "Buns", "Booty Boy", "Willy", "Flash", "Knox", "Yoink",

  "Biscuit", "Gravy", "Sizzle", "Chunk", "Scooter", "Peewee", "Sarge", "Chief", "Deacon", "Earl",
  "Cooter", "Slim", "Peanut", "Cornbread", "Grits", "Sausage", "Pancake", "Truck", "Bulldozer", "Anvil",
  "Hammer", "Nailer", "Sledge", "Crusher", "Smasher", "Bonecrusher", "Thunder", "Lightning", "Gravedigger", "Junkyard",
  "Meathook", "Chainsaw", "Boomstick", "Nitro", "Fireball", "Bruiser", "Slugger", "Wrecker", "Anchor", "Torque",
  "Sparkplug", "Little Debbie", "Hot Dog", "Chili Dog", "Corndog", "Nugget", "Wingman", "Drumstick", "Gizzard", "Casserole",
  "Goulash", "Meatloaf", "Pot Roast", "Brisket", "Ribeye", "Sirloin", "Chowder", "Gumbo", "Jambalaya", "Hushpuppy",
  "Catfish", "Bass", "Trout", "Crawdad", "Possum", "Skunk", "Beaver", "Weasel", "Ferret", "Otter",
  "Badger", "Wolverine", "Cougar", "Bobcat", "Coyote", "Buzzard", "Vulture", "Hawkeye", "Snakebite", "Rattler",
  "Gator", "Cottonmouth", "Sidewinder", "Copperhead", "Viper", "Cobra", "Mamba", "Python", "Anaconda", "Boa",
  "Iguana", "Gecko", "Chameleon", "Salamander", "Newt", "Toad", "Bullfrog", "Tadpole", "Polliwog", "Mudpuppy",
  "Swamp Thing", "Bayou", "Cajun", "Hillbilly", "Yokel", "Hayseed", "Backwoods", "Boondock", "Ridge Runner", "Mountain Man",
  "Trailblazer", "Prospector", "Miner", "Lumberjack", "Woodchuck", "Sawdust", "Splinter", "Knothole", "Timber", "Plank",
  "Two-By-Four", "Nail Gun", "Wrench", "Socket", "Pliers", "Hacksaw", "Jigsaw", "Bandsaw", "Buzzsaw", "Chopper",
  "Doc", "Preacher", "Deputy", "Marshal", "Ranger", "Constable", "Big Country", "Radar", "Snoop", "Stumpy", "Preston",

  "Blorp", "Zibbly", "Florpo", "Gribnitz", "Wobblestein", "Sploot", "Yeetus", "Boof", "Dinglehopper", "Snickerdoodle",
  "Kablammo", "Zonk", "Wackford", "Doodle", "Noodle", "Pretzel", "Snorf", "Bloop", "Glorp", "Fizzwick",
  "Blammo", "Zoop", "Frobnak", "Glimmer", "Wumbo", "Skronk", "Flumph", "Grondle", "Blibber", "Snazzle",
  "Wizzle", "Fropple", "Gribble", "Nurble", "Plonk", "Squonk", "Bramble", "Crinkle", "Wobbleton", "Fuzzington",
  "Snugglebottom", "Wafflestein", "Bumblesnout", "Cragglethorpe", "Dribblesworth", "Fizzlebottom", "Gronkenstein", "Hobblesnitch", "Jigglypants", "Klondikebar",
  "Lumpington", "Mumblecore", "Noodlewhisk", "Ooglesby", "Puddleston", "Quirklebee", "Rumplestone", "Snickerbottom", "Trundlewick", "Vroomington",
  "Wobblesnatch", "Xylophonic", "Yodelbottom", "Zippertwist", "Bamboozle", "Cattywampus", "Diddly", "Fandango", "Gobsmack", "Higgledy",
  "Jibber", "Kerfuffle", "Lollygag", "Malarkey", "Nincompoop", "Oddball", "Persnickety", "Quibble", "Ruckus", "Shenanigan",
  "Tomfoolery", "Vexation", "Whatchamacallit", "Yammer", "Zigzag", "Absquatulate", "Balderdash", "Codswallop", "Discombobulate", "Flibbertigibbet",
  "Gallivant", "Hootenanny", "Jackalope", "Knucklehead", "Lollapalooza", "Mumbo", "Nightowl", "Poppycock", "Quizzical", "Razzmatazz",

  "Chad", "Duke", "Rocco", "Jaxson", "Deontay", "Bubba", "Rusty", "Skeeter", "Cletus", "Bob",
  "Buck", "Tank", "Rowdy", "Gunner", "Dax", "Zeke", "Boomer", "Hank", "Jermaine", "Tyreese",
  "Cordarrelle", "Jaquan", "Damarcus", "Tito", "Otis", "Moose", "Beau", "Lorenzo", "Kellen", "Tavarius",
  "Wendell", "Chip", "Doug", "Nacho", "Chauncey", "Bartholomew", "Rex", "Slade", "Ripley", "Ozzie",
  "Fitz", "Kirby", "Blaze", "Cash", "Tiny", "Big Rig", "Turbo", "Sunny", "Winston", "Percival",
  "Keyshawn", "Tremaine", "Orlando", "Roscoe", "Ferdinand", "Sherman", "Dewey", "Vlad", "Yancy", "Gooch",
  "Pickle", "Waffles", "Buster", "Clyde", "Diesel", "Tank Jr.", "Kwame", "Ravioli", "Chauncy", "Bo",
  "Meatball", "Thad", "Zane", "Peter", "Sketch", "Cush", "Duggy", "Dunky", "Bam Bam", "Big Boy",
  "Stubby", "Porkchop", "Schweppo", "T-Bone", "Steaknife", "Bonesaw", "Floridaman", "Tubby", "Jahmyr", "D'Andre",
  "Jimbo", "2 Toes", "Sackman", "Whole Hog", "Boost Juice", "Hankjohn", "Herbert", "Jerry", "JerryJim", "JAA'M", "Chumbo",
  "Moff", "Bruce", "Rudy", "The Ghost of", "Gooby",
  "Waffle Iron", "Toaster Strudel", "Biscuit Gravy", "Meat Sweats", "Gravy Train Jr.", "Sizzle Steak", "Sir Loin", "Chuck Roast", "Prime Rib", "Baby Back",
  "Rack of Ribs", "Turkey Leg", "Drumstick Jr.", "Wing Man", "Nugget King", "Tender Loin", "Sloppy Joe", "Chili Cheese", "Nacho Supreme", "Taco Tuesday",
  "Burrito Bandito", "Quesadilla Kid", "Enchilada Man", "Fajita Frank", "Guac Daddy", "Salsa Steve", "Queso Boy", "Churro Chuck", "Flan Man", "Tres Leches",
  "Pico de Gallo", "Sir Nacho", "Cheese Curd", "Poutine Pete", "Maple Syrup", "Bacon Bits", "Hash Brown", "Sausage Link", "Grits McGee", "Butterbean",
  "Okra Joe", "Collard Green", "Sweet Tea", "Moon Pie", "RC Cola", "Cheerwine Charlie", "Boiled Peanut", "Fried Green", "Pecan Pie", "Sweet Potato",
  "Casserole King", "Deviled Egg", "Pimento Cheese", "Hush Puppy Jr.", "Fish Fry Frank", "Crawfish Boil", "Gumbo Pot", "Etouffee Eddie", "Beignet Boy", "Jambalaya Jr.",
];

const NICKNAMES = [
  "The EZ Bake Oven", "Touchdown Machine", "Lil' Cleats", "Shadow the Edgehog",
  "The Hometown Hunk", "Uncle Money", "Mr. Fourth Quarter", "The Ankle Breaker", "Grandpa Wheels",
  "The Big Unit", "The King of Swing", "The Pablo Sanchez of Football", "Big Sexy", "Baby Clapback",
  "Massive Hands Guy", "THE BEEF", "Mr. Loves His Wife", "Dr. Dunk-on-em",
  "The Human Highlight Reel", "Sir Drops-a-Lot", "The Contract Year Special", "Uncle Cardio",
  "The Waiver Wire Wizard", "Grandma's Favorite", "The Human Victory Cigar", "Mr. Third and Long",
  "The Garbage Time Legend", "Captain Checkdown", "The Red Zone Menace", "Lil' Thunder",
  "The Human Warranty Void", "Coach's Nightmare", "The Sunday Scaries", "Papa Touchdown",
  "The One-Man Blooper Reel", "Sir Fumbles-a-Lot", "The Trade Deadline Ghost", "Mr. Bye Week",
  "The Human Ice Pack", "Fantasy Football's Worst Enemy", "The Waterboy's Hero", "Big League Chew",
  "The Locker Room DJ", "Mr. Two-Minute Drill", "The Concession Stand King", "Grandpa's Pride and Joy",
  "The Human Turnstile", "Sir Hands of Stone", "The Practice Squad Prodigy", "Mr. Popcorn Time",
  "The Injury Report Regular", "Captain Overtime", "The Locker Room Poet", "Mr. Highlight Tape",
  "The Undrafted Legend", "Sir Blocks-a-Lot", "The Fourth and Inches King", "Baby Thunder", "The Boy With 60-Year-Old Knees",
  "The Walking Traffic Violation", "King of Just Dance", "The Buck Bumble Baddy", "Mr. Always Gotta Piss", "Bubble Gut",
  "The Smallest Person EVER", "The Youngest Person EVER", 
  "The Human Victory Formation", "Sir Eats-a-Lot", "The Fantasy Killer", "Mr. Monday Night Special",
  "The Waiver Wire Whale", "Captain Hot Read", "The Human Kneel Down", "Lil' Snack Pack",
  "The Turf Monster", "Mr. Never Fumbles", "The Sunday Ticket Legend", "Captain Obvious Route",
  "The Human Cheat Code", "Sir Scores-a-Lot", "The Backyard Legend", "Mr. Fantasy Bust",
  "The Human Victory Lap", "Lil' Stat Padder", "The Podcast Darling", "Mr. Always Open",
  "The Human Highlight Machine", "Captain Comeback", "The Waterboy's Nightmare", "Sir Catches-a-Lot",
  "The Trade Bait King", "Mr. Locker Room Legend", "The Human Snack Table", "Lil' Playoff Push",
  "The Bench Warmer's Dream", "Mr. Two-A-Days", "The Ittiest Bittiest", "The Boston Strangler",
  "Only Here For The Zipline", "Never Talks", "It's Not His Time", "Baby of the Year", "Inventor of Sloppy Steaks",
  "Big Papi", "Hungry Little Guy", "The Milkman", "The One That Tells Lies",
];

const SUFFIXES = ["", "", "", "", "", "", " Jr.", " III", " Sr.", " II", " IV",];

const COACH_FIRST = ["Coach", "Mr.", "Skipper", "Big", "Papa", "Capn", "Daddy", "Big Man",];

const AI_MANAGER_NAMES = [
  "The Pokeballers", "We Are The Machampions", "Magikarp Splash Zone", "The Kanto Kommanders",
  "The Johto Journeymen", "The Hoenn Heroes", "The Sinnoh Stars", "The Unova Underdogs",
  "The Kalos Kings", "The Alola All-Stars", "The Galar Guardians", "The Paldea Protectors",
  "The Elite Forretress", "Team Brockett", "Misty's Sensational Sisters", "Big Man Blastboys",
  "Fast & Feebias", "Big Klang Theory", "Game of Throhs", "The Phantump Menace", "Lord of the Flygons",
  "Skitty Skitty Bang Bang", "Paul Blart Dusclops", "Gary's Goon Squad", "Teenage Mutant Ninjask Turtles",
  "The Edgehogs", "Timothy & The Chestnuts", "Slowpoke Slow Starts", "Bidoof Believers", "Team Sky",
  "The Wobbuffet Wall", "Snorlax Naptime FC", "The Charizard Chargers", "Gengar's Ghost Squad",
  "The Lucario Legends", "Mewtwo's Might", "The Eeveelution Elite", "Gyarados Gang",
  "The Dragonite Dynasty", "Metagross Mafia", "The Umbreon Underground", "Rayquaza Raiders",
  "The Blastoise Blockers", "Venusaur Vandals", "The Arcanine Aces", "Machamp's Militia",
  "The Alakazam Alliance", "Tyranitar Terror", "The Scizor Squadron", "Garchomp Gladiators",
  "The Salamence Slammers", "Zoroark's Zealots", "The Corviknight Crew", "Toxtricity Turbo",
  "The Grimmsnarl Gauntlet", "Dragapult Demolition", "The Hatterene Hitmen", "Cinderace Circuit",
  "The Rillaboom Rowdies", "Inteleon Inc.", "The Wobuffet Wannabees", "The Punky Pidoves",
  "The Perserrker Pirates", "The Pecan Sandygasts", "Rock, Paper, Scizors", "THE MOON KICKS YOU!",
  "The Snorlax Snoozefest", "Weezing Out The Competition", "Slowbro's Slow Cookers", "Magcargo's Molten Misfits",
  "The Ditto Copycats", "Muk's Toxic Waste Management", "Grimer's Garbage Squad", "The Voltorb Volatility",
  "Electrode's Explosive Ending", "Koffing Around", "Jigglypuff's Lullaby Legion", "The Exeggutor Eggheads",
  "Farfetch'd's Last Stand", "The Slowpoke Tail Draft", "Gastly's Ghost Writers", "The Haunter Hauntdown",
  "Mimikyu's Disguise Crew", "The Wailord Whale Watchers", "Gyarados's Rage Quitters", "The Metapod Harden Squad",
  "Kakuna's Cocoon Crew", "The Magikarp Millionaires", "Zubat's Cave Dwellers", "The Ekans Charmers",
  "Weedle's Sting Operation", "Rattata's Run It Back", "The Spearow Squadron", "Pidgey's Flock",
  "The Diglett's Dig Deep", "Sandshrew's Sandstorm Squad", "The Vivacious Venonats", 
];

const FRIEND_NAMES = [
  "Zane", "Cush", "Peebr", "Chris", "Sketch", "Shannon", "Peter", "Bailey",
];

/* Silly weekly events. {kind, text, mult, weeksOut} */
const BOOST_EVENTS = [
  "got asked to prom by their high school crush and is FLYING HIGH today",
  "found a free $20 in some homeless person's cup and is feeling unstoppable",
  "watched a motivational Dwayne The Rock Johnson video at 4am",
  "is playing angry after being left out of the 'League Baddies' group chat",
  "won a slam poetry contest at their local coffee shop last night",
  "ate 10 Portillo's Chicago Style Hot Dogs at walkthroughs. Fueled!",
  "learned the opposing defense insulted their mom's Toyota RAV4",
  "got a new pair of cleats that light up and aren't cleats they're just Skechers but they feel like cleats",
  "just bought 20 candles at Bath & Body Works half-off",
  "had a dream where they scored 4 touchdowns butt booty naked. Time to do it for real",
  "was called 'washed' on Joe Rogan's podcast",
  "didn't get woken up by their cat at 3am last night",
  "just found their lucky socks after a two-week search",
  "watched game tape of their rookie season and got emotional",
  "beat their little cousin in Madden and rode the high all day",
  "got called 'the GOAT' by a stranger in the parking lot",
  "found a four-leaf clover in the end zone during warmups",
  "has been blasting 'Eye of the Tiger' on repeat all week",
  "got a standing ovation just for stretching",
  "finally figured out how to do the pregame handshake",
  "had their jersey retired in a dream and woke up motivated",
  "got complimented on their Spongebob cleats by Spongebob himself",
  "just met the ghost homeless man on the top of the Polar Express and now believes in the spirit of Christmas",
  "just got approved for a really good credit card",
  "saw a shooting star during the national anthem",
  "got a shoutout from the stadium DJ",
  "finally beat their sibling's high score in a Flappy Bird",
  "was told by a psychic that there's is 'the biggest' on the team",
  "got extra syrup on their pregame pancakes",
  "found out their bobblehead is finally being made",
  "just got their braces off and can't stop smiling",
  "got picked first in every backyard game this week",
  "is wearing socks with little footballs on them for luck",
  "received a heartfelt letter from a young fan",
  "beat traffic on the way to the stadium for once",
  "got told they smell like a champion by the equipment guy",
  "just discovered their true Pokemon type match-up advantage",
  "had a really good nap in the locker room",
  "saw Chris's uncle catch a moth, put it in his beer, and drink it",
  "saw Chris's uncle do a backflip off a tire swing",
  "saw Chris's uncle arm wrestle a raccoon for seeds",

];

const SLUMP_EVENTS = [
  "stayed up all night arguing with a stranger online",
  "forgot the playbook at home. Whole playbook",
  "is distracted because their fantasy team is losing",
  "tried a new pre-game meal: gas station sushi",
  "keeps getting lost on the way to the huddle",
  "is going through a very public breakup",
  "got into a heated debate with the mascot at halftime",
  "wore the wrong cleats and slipped on literally every route",
  "has been thinking about the vastness of space all week",
  "is mad they were benched in someone's fantasy lineup",
  "can't stop thinking about a typo they made in a group chat",
  "got out-argued by a raccoon over a sandwich last night",
  "is wearing the wrong lucky socks by mistake",
  "just found out their fantasy team (the human kind) got dumped",
  "spilled ketchup on the good jersey right before warmups",
  "is stuck humming a jingle from a car commercial",
  "got roasted by their little cousin over group chat",
  "tripped over the sideline cord in front of everybody",
  "is convinced the ref has a personal vendetta",
  "forgot their good gloves at the hotel",
  "had a stress dream about missing the team bus",
  "is nursing a bruised ego after losing at cards",
  "can't stop replaying an embarrassing pregame interview",
  "got a bad haircut right before the game",
  "is distracted trying to remember if they left the stove on",
  "just got some frustrating news about their fantasy football team",
  "is playing with a slight sunburn from a beach day",
  "got into it with the team mascot over a dance-off",
  "is convinced their cleats are cursed",
  "keeps overthinking every single route",
  "is annoyed the team plane had bad wifi",
  "got benched in someone's fantasy lineup and won't let it go",
  "is distracted by a mysterious itch that won't go away",
  "just remembered they owe a friend twenty bucks",
  "had a rough night's sleep worrying about nothing in particular",
  "is playing with a headache from too much stadium nachos",
  "got a talking-to from a coach and is sulking about it",
  "lost a bet and has to wear a silly hat all week",
  "is still mad about a missed call from three weeks ago",
  "can't stop thinking about what's for dinner",
];

const INJURY_EVENTS = [
  { note: "tweaked a hamstring", weeks: 1 },
  { note: "high ankle sprain", weeks: 3 },
  { note: "sprained a wrist celebrating too hard", weeks: 1 },
  { note: "concussion protocol after a helmet-to-helmet TikTok dance", weeks: 1 },
  { note: "pulled a groin doing the worm", weeks: 2 },
  { note: "bruised ribs after tackling the Gatorade cart", weeks: 2 },
  { note: "turf toe (all four toes)", weeks: 2 },
  { note: "fell off a hoverboard in the parking lot", weeks: 3 },
  { note: "got their tail stuck in a locker", weeks: 1 },
  { note: "sunburn. Severe, catastrophic sunburn", weeks: 1 },
  { note: "knee sprain", weeks: 4 },
  { note: "shoulder strain from carrying the whole offense", weeks: 2 },
  { note: "jammed a finger high-fiving too aggressively", weeks: 1 },
  { note: "rolled an ankle stepping on a stray football", weeks: 2 },
  { note: "strained a hip doing a touchdown dance", weeks: 2 },
  { note: "tweaked their back sleeping wrong before the game", weeks: 1 },
  { note: "took an accidental cleat to the shin", weeks: 1 },
  { note: "pulled a hamstring sprinting to catch the team bus", weeks: 2 },
  { note: "jammed a thumb in a locker door", weeks: 1 },
  { note: "twisted a knee celebrating in the end zone", weeks: 3 },
  { note: "got a stinger going over the middle", weeks: 1 },
  { note: "strained an oblique from laughing too hard at practice", weeks: 1 },
  { note: "bruised a hip diving for a first down", weeks: 2 },
  { note: "tweaked a calf during a pregame sprint", weeks: 1 },
  { note: "jammed a wrist trying to break a fall", weeks: 1 },
  { note: "strained a quad doing pregame lunges", weeks: 2 },
  { note: "took a helmet to the ribs on a blitz", weeks: 2 },
  { note: "sprained an ankle on a wet spot in the end zone", weeks: 3 },
  { note: "dislocated a finger on an overthrown pass", weeks: 1 },
  { note: "hurt a shoulder diving for a sideline catch", weeks: 3 },
  { note: "pulled a groin lunging for a loose ball", weeks: 2 },
  { note: "tweaked a neck from an awkward tackle", weeks: 1 },
  { note: "bruised a heel landing wrong on a jump", weeks: 1 },
  { note: "strained a hamstring chasing down an interception", weeks: 2 },
  { note: "hurt a wrist bracing for a hit", weeks: 1 },
  { note: "was dared to pretend to be hurt for 4 weeks", weeks: 4 },
  { note: "torn ACL", weeks: 18 },
  { note: "broken heart", weeks: 2 },
  { note: "leg just straight up fell off", weeks: 2 },

];

const ABSENCE_EVENTS = [
  { note: "suspended for tax evasion", weeks: 2 },
  { note: "missed the team flight (was at a water park)", weeks: 1 },
  { note: "jury duty", weeks: 1 },
  { note: "suspended for arguing with a referee for 45 straight minutes", weeks: 1 },
  { note: "is starring in a regional car dealership commercial shoot", weeks: 1 },
  { note: "got trapped in a Poke Ball and nobody could find it", weeks: 1 },
  { note: "took a personal day to attend a cousin's fantasy draft", weeks: 1 },
  { note: "suspended for eating the game ball", weeks: 2 },
  { note: "is competing in a hot dog eating contest", weeks: 1 },
  { note: "overslept and missed the team meeting", weeks: 1 },
  { note: "got stuck helping a stranded motorist and missed the bus", weeks: 1 },
  { note: "is filming a cameo in a low-budget movie", weeks: 1 },
  { note: "took an emergency trip to return an overdue library book", weeks: 1 },
  { note: "got lost looking for the stadium and ended up in another city", weeks: 1 },
  { note: "is quarantined after a run-in with a bad gas station burrito", weeks: 1 },
  { note: "is attending a mandatory family reunion", weeks: 1 },
  { note: "got locked out of the locker room and gave up looking for help", weeks: 1 },
  { note: "is competing in a regional chili cook-off", weeks: 1 },
  { note: "took a wrong turn and ended up at a rival team's facility", weeks: 1 },
  { note: "is serving a one-game suspension for excessive celebrating", weeks: 1 },
  { note: "got stuck in a parade unrelated to football", weeks: 1 },
  { note: "is on a mandatory social media detox after a bad tweet", weeks: 2 },
  { note: "took a personal day to deal with a very aggressive goose", weeks: 1 },
  { note: "is testifying in a minor traffic court case", weeks: 1 },
  { note: "got roped into being best man at a wedding this week", weeks: 1 },
  { note: "is stuck at the DMV renewing a license", weeks: 1 },
  { note: "took an unscheduled trip to Six Flags", weeks: 1 },
  { note: "is in a legal dispute over a parking spot", weeks: 1 },
  { note: "went home sick after eating a suspicious gas station hot dog", weeks: 1 },
  { note: "is grounded by their mom for missing curfew", weeks: 1 },  { note: "ran too fast and their feet caught on fire", weeks: 1 },
  { note: "got cramps from eating too much beef", weeks: 1 },
  { note: "went to watch that movie about the beach that makes you old", weeks: 1 },
  { note: "got distracted by what they thought was a UFO but was definitely in no way, shape, or form a UFO", weeks: 1 },
  { note: "needed a Diet Doctor Pib mid-game, got held up in traffic on the way to the store, forgot their wallet, drove home, drove back, slowed down to look at a car accident, but anyway do you want anything from the store", weeks: 1 },
  { note: "bloodfarts", weeks: 1 },
  { note: "opened their phone during a timeout and won't stop doomscrolling", weeks: 1 },
  { note: "was caught pretending to be Petey Piranha from Super Mario Sunshine on the wrong side of the field instead of playing", weeks: 1 },
  { note: "got into an argument with a fan in the stands", weeks: 1 },
  { note: "got the hiccups", weeks: 1 },
  { note: "got the suds", weeks: 1 },
  { note: "got what sounded like a family emergency phone call during the snap. hope everything is okay", weeks: 1 },
  { note: "found out their Amazon account got hacked and needed a sub", weeks: 1 },
  { note: "fingers got too pruny from sweat", weeks: 1 },
  { note: "realized they don't even like football", weeks: 1 },
  { note: "watched an Espathra paint a tunnel with an open road on the other side onto the wall and tried to run through it", weeks: 1 },
  { note: "had to stop and wait for two guys carrying a big glass pane very carefully passing by", weeks: 1 },
  { note: "left to go on a long pilgrimage", weeks: 2 },
  { note: "a giant bird literally flew down, grabbed him, and just took off", weeks: 1 },

];

/* Flavor quotes for mid-season NFL-to-NFL player trades (backups seeking snaps, injury replacements, etc). */
const TRADE_QUOTES = [
  "\"We wish {name} the best, but everybody needs a fresh start sometimes,\" said the {oldTeam} coach.",
  "\"We HATED {name}! I don't care if he scored or was super cool! I freakin' hate that guy this is personal this is my personal choice!,\" said the {oldTeam} coach.",
  "\"{name} wanted a real shot at snaps, and we couldn't promise that here,\" the {oldTeam} GM admitted.",
  "\"Excited to bring in {name}. We think there's another level there,\" said the {newTeam} coach.",
  "\"{name} texted me at 2 AM asking to be traded. Who am I to say no,\" joked the {oldTeam} GM.",
  "\"{name} deserves to start somewhere, and it wasn't going to be here,\" said an {oldTeam} insider.",
  "\"We've been calling about {name} for weeks. Thrilled it finally got done,\" said the {newTeam} front office.",
  "\"{name} is a great locker room guy, we just had too many bodies at the position,\" said the {oldTeam} coach.",
  "\"Sometimes a change of scenery is all a player needs,\" the {newTeam} coach said of {name}.",
  "\"{name} asked out. We respected that and made it happen,\" the {oldTeam} GM said.",
  "\"{name} still has a lot of football left in the tank. We got a steal here,\" said the {newTeam} coach.",
  "\"It's a business. {name} understood that better than most,\" said the {oldTeam} GM.",
  "\"{name} called it 'a business decision.' We call it addition by subtraction,\" laughed the {newTeam} coach.",
  "\"Honestly? {name} beat me at cards on the team plane one too many times,\" admitted the {oldTeam} coach.",
  "\"{name} kept eating all the pregame snacks meant for the whole team. We had to make a change,\" said the {oldTeam} GM.",
  "\"We tried to keep {name}, but he really wanted to play somewhere with a nicer mascot,\" said the {oldTeam} front office.",
  "\"{name} showed up to the {newTeam} facility with donuts for everybody. Instant fan favorite,\" said a {newTeam} staffer.",
  "\"No hard feelings. {name} just really wanted to guard the {newTeam} state line,\" joked the {oldTeam} GM.",
  "\"{name} said the {oldTeam} locker room smelled weird. That's on the record, that's what he said,\" the {oldTeam} coach sighed.",
  "\"We're thrilled. {name} once beat our starter in a footrace during a scouting visit,\" said the {newTeam} coach.",
  "\"{name} asked for a bigger role and honestly, we just didn't have a whiteboard marker to draw one up,\" said the {oldTeam} coach.",
  "\"Adding {name} was a no-brainer. Our fans have been chanting his name since the rumor started,\" said the {newTeam} GM.",
  "\"It smelled like a retirement over there. That's the sole reason I left,\" said {name}.",
  "\"I will have my revenge...,\" said {name} about {oldTeam}.",
  "\"I've heard this city's Applebee's stays open until 2am so that definitely factored into my decision,\" said {name} about {newTeam}.",
  "\"I have a lot of respect for the players and coaches of {oldTeam}. I don't know any of there names but I respect them,\" said {name}.",
  "\"I'm gonna miss the guy who washed my car the most. He always left a chocolate in the window',\" said {name}.",
  "\"These uniforms are SO MUCH COOLER!,\" said {name} about {newTeam}.",
  "\"{name} kept calling the {oldTeam} logo 'cringe.' We had no choice,\" said the {oldTeam} GM.",
  "\"I just needed a fresh start, and also there's a really good taco truck near the {newTeam} facility,\" said {name}.",
  "\"{name} refused to stop doing the team handshake wrong. Every single time. We gave up,\" said the {oldTeam} coach.",
  "\"Honestly {oldTeam} fans were too nice to me. I need some heckling in my life,\" said {name}.",
  "\"{name} asked if we had a hot tub in the locker room. We do not. That was that,\" said the {oldTeam} GM.",
  "\"I heard {newTeam} has a better fantasy football league in their front office. Had to be a part of it,\" said {name}.",
  "\"We didn't trade {name}, {name} traded us. There's a difference and I don't have time to explain it,\" said the {oldTeam} coach.",
  "\"{name} wouldn't stop naming the equipment truck. It has feelings now. We can't undo that,\" said the {oldTeam} GM.",
  "\"{newTeam} promised {name} unlimited postgame smoothies. We could not compete with that offer,\" said the {oldTeam} GM.",
  "\"{name} said the vibes were off. Can't argue with vibes,\" said the {oldTeam} coach.",
  "\"Our mascot and {name} got into it backstage. Never fully recovered from that one,\" said the {oldTeam} GM.",
  "\"{name} wanted a locker closer to the vending machine. {newTeam} delivered. We couldn't,\" said the {oldTeam} coach.",
  "\"I just really believe in {newTeam}'s pregame playlist,\" said {name}.",
  "\"{name} said our stadium nachos were 'mid.' That's when I knew this was over,\" said the {oldTeam} GM.",
  "\"We offered {name} a raise. He wanted a parking spot closer to the door instead. We couldn't make that happen,\" said the {oldTeam} GM.",
  "\"{newTeam} has better group chat energy. That's just facts,\" said {name}.",
  "\"{name} said he manifested this trade during a meditation retreat. Who am I to argue with the universe,\" said the {oldTeam} coach.",
  "\"Frankly, we just ran out of nicknames for {name}. Had to let him find a new team that could keep up,\" said the {oldTeam} GM.",
  "\"{name} wanted to be closer to his fantasy football league's in-person draft. We respect the hustle,\" said the {newTeam} coach.",
  "\"{oldTeam} just didn't have room in the budget for {name}'s snack requests anymore,\" said the {oldTeam} GM.",
  "\"{name} said something about destiny and a fortune cookie. We didn't ask questions,\" said the {newTeam} coach.",
  "\"We really just wanted to see {name} in a different colored jersey. Simple as that,\" said the {oldTeam} GM.",
  "\"{name} beat our mascot in a dance-off and things got weird after that,\" said the {oldTeam} coach.",
  "\"{newTeam} let {name} name the team bus. That's the kind of commitment we couldn't match,\" said the {oldTeam} GM.",
];

/* Post-game spotlight blurbs, keyed by how a player's outing compared to their usual output. */
const SPOTLIGHT_HOT = [
  "{name} looked like a completely different player out there and should only build on it next week.",
  "{name} dominated the field and looks primed to play even better next week in an easier matchup.",
  "{name} was a problem all game and the tape will only get scarier from here.",
  "{name} is heating up at the perfect time — buy stock now before it's too late.",
  "{name} put the league on notice. Don't be surprised if this becomes a weekly thing.",
  "{name} looked like the best player on the field, full stop.",
  "{name} is playing with a confidence that should terrify next week's opponent.",
  "{name} turned in a performance that's going to be hard to bench moving forward.",
  "{name} made it look like a video game on rookie difficulty.",
  "{name} is must-start territory now, no ifs, ands, or buts.",
  "{name} is the kind of story that makes a bye week manager start sweating.",
  "{name} just cashed the biggest check of the season and it wasn't close.",
  "{name} has officially entered 'must-watch' status heading into next week.",
  "{name} might be literally the best player in the league. Emphasis on 'might be' I don't know cuz I don't watch football.",
  "{name} has the makings of an every week fantasy stud if they can keep this up.",
  "{name} looked like they were playing a different sport than everybody else out there.",
  "{name} put together a Sunday that fantasy managers will be bragging about for weeks.",
  "{name} is the reason bye weeks feel personal now.",
  "{name} is playing angry, and it is working out great for everybody who drafted them.",
  "{name} just declared war on opposing secondaries everywhere.",
  "{name} looks like they found a cheat code and isn't telling anybody.",
  "{name} is somehow getting better every single week, which shouldn't be legal.",
  "{name} just posted numbers that are going to get talked about at the water cooler all week.",
  "{name} is must-see TV right now and the opposing coordinator knows it.",
  "{name} is balling out so hard that even rival fans are tipping the cap.",
  "{name} is peaking at exactly the right time and the timing could not be better.",
];
const SPOTLIGHT_COLD = [
  "{name} looked lost out there and needs to figure it out fast before the bench calls.",
  "{name} was a non-factor and the concern is starting to feel real.",
  "{name} is in a slump that's bordering on worrisome heading into next week.",
  "{name} struggled to find a rhythm all game long — buyer beware next week.",
  "{name} looked a step slow and it might be time to pump the brakes on expectations.",
  "{name} is trending in the wrong direction and needs a bounce-back game, badly.",
  "{name} had one of those games everybody wants to forget as soon as possible.",
  "{name} could be in danger of losing snaps if this continues.",
  "{name} looked like they left their cleats at home and just wore socks out there.",
  "{name} is testing the patience of anyone who drafted them early.",
  "{name} needs a serious gut check before next week rolls around.",
  "{name} might want to just forget this game ever happened.",
  "{name} is one more dud away from a permanent bench role.",
  "{name} looking like a man with glass bones and paper skin.",
  "{name} is a whiny, pouty, shell of a man. Straight bad vibes in the locker room right now.",
  "{name} played like they left their game plan at home along with their cleats.",
  "{name} is giving off major 'please bench me' energy right now.",
  "{name} looked like they were moving in slow motion while everyone else played at full speed.",
  "{name} is in full-blown fantasy football witness protection mode.",
  "{name} needs a vacation, a nap, and a completely different game plan, in that order.",
  "{name} is on thin ice and the bench is getting warmer by the week.",
  "{name} might want to sit this next matchup out mentally before they sit it out for real.",
  "{name} looked like they forgot the snap count was a real thing.",
  "{name} put together a performance that even their own mother might bench.",
  "{name} is cratering hard and there's no floor in sight right now.",
  "{name} needs to have a long talk with their fantasy football conscience.",
];
const SPOTLIGHT_STEADY = [
  "{name} did exactly what was expected, nothing more, nothing less.",
  "{name} was steady as always, the kind of floor you can build a lineup around.",
  "{name} quietly got the job done. Nothing flashy, but reliable as ever.",
  "{name} kept things simple and got the job done without much fuss.",
  "{name} is what they are at this point: dependable, if unspectacular.",
  "{name} showed up, did the job, went home. Nothing to see here.",
  "{name} is the human equivalent of a vanilla milkshake — fine, always fine.",
  "{name} won't wow anybody, but they won't sink you either.",
  "{name} is the definition of 'just start them and don't think about it too hard.'",
  "{name} put up the exact same stat line their agent probably predicted before the season.",
  "{name} is the reliable sedan of fantasy football: not exciting, but it always starts.",
  "{name} shows up on time, does the job, clocks out. Union rep would be proud.",
  "{name} isn't going to win you the week, but they sure aren't going to lose it either.",
  "{name} is boring in the best possible way for a fantasy manager.",
  "{name} keeps doing the same thing every week and honestly, respect for the consistency.",
  "{name} is the kind of player you forget is even on your roster until they show up on the stat sheet.",
  "{name} delivered a totally unremarkable, perfectly acceptable stat line.",
];

/* Analyst-style follow-up lines used to flesh out the player card scouting report. */
const SURPRISE_GOOD_NOTES = [
  "Nobody saw that one coming from {name} — a genuine surprise in the best way.",
  "{name} wasn't projected for anything close to that, but here we are.",
  "Even the coaching staff looked shocked at how well {name} played.",
  "That's the kind of breakout line that gets a player a bigger role going forward.",
  "Even {name}'s own family group chat didn't see that one coming.",
  "Vegas would've laughed you out of the building for predicting that stat line from {name}.",
  "That performance from {name} is going straight into the highlight reel nobody expected.",
  "Somewhere, a scout who cut {name} is quietly rethinking their whole career.",
  "{name} just made every fantasy manager who benched them regret every decision they've ever made.",
  "That game from {name} is going to get replayed on every highlight show this week.",
  "Even {name}'s harshest critics have to tip the cap after that showing.",
  "The fantasy waiver wire is about to get very crowded because of {name}.",
  "{name} just turned doubters into believers in the span of one afternoon.",
];
const SURPRISE_BAD_NOTES = [
  "That's a stunner — nobody expected {name} to come up that empty.",
  "{name} had a much rougher day than anyone anticipated.",
  "A real head-scratcher of a performance from {name}.",
  "Even the most pessimistic projections had {name} doing better than that.",
  "Somewhere, {name}'s fantasy owner is staring at a wall right now.",
  "Nobody, and we mean nobody, had {name} doing that little.",
  "That's the kind of dud that makes you double check the box score twice.",
  "The projections owe {name}'s fantasy managers a written apology.",
  "Nobody circled this game as a trap, and yet here we are.",
  "{name} really said 'not today' to an entire fanbase's expectations.",
  "That was a special kind of quiet from a player who's usually anything but.",
  "Somewhere a waiver-wire pickup is laughing at {name} right now.",
  "This is the kind of week that makes you question every scouting report ever written on {name}.",
];
const INJURY_STEPUP_NOTES = [
  "{name} stepped up big with {teammate} banged up, and made the most of the opportunity.",
  "With {teammate} sidelined, {name} saw a bigger workload and cashed in.",
  "{name} filled in admirably while {teammate} nurses an injury.",
  "The extra snaps with {teammate} out clearly agreed with {name}.",
  "{name} answered the call the second {teammate} went down, no hesitation.",
  "Injuries are nobody's friend, but {name} sure made the most of {teammate}'s absence.",
  "{name} took advantage of every extra rep with {teammate} out of the lineup.",
  "{name} was next in line and cashed in the second {teammate} went down.",
  "Somebody had to pick up the slack for {teammate}, and {name} volunteered in a big way.",
  "{name} turned {teammate}'s misfortune into the best game of their season.",
  "It's next-man-up mentality, and {name} answered the call in a big way with {teammate} out.",
  "{name} made the most of an opportunity that only existed because {teammate} went down.",
];
const BYE_OUTLOOK_NOTES = [
  "{name} is on a bye next week, so pencil in someone else.",
  "No game for {name} next week — bye week, plan accordingly.",
  "{name} gets a breather next week on the bye.",
  "{name} is off next week. Don't be the manager who forgets and starts them anyway.",
  "{name} is resting up on a bye — find a fill-in for the week.",
  "Mark it down: {name} doesn't suit up next week thanks to the bye.",
  "{name} is taking a scheduled week off, so don't leave an empty slot behind.",
  "The bye week comes for everyone, and this week it's {name}'s turn.",
  "{name} won't be adding to the stat sheet next week — bye week is here.",
];
const MATCHUP_OUTLOOK_EASY = [
  "{name} draws a leaky {team} defense next week and could keep it rolling.",
  "The matchup sets up nicely for {name} against a {team} defense that's been an open door.",
  "Analysts love this spot for {name} — {team} has struggled to slow anybody down.",
  "{name} should have plenty of room to work against {team} next week.",
  "Circle it now: {name} against {team} looks like a smash spot on paper.",
  "{team} has been giving up points in bunches, and {name} is next in line to feast.",
  "If there's a week to start {name} with confidence, it's this one against {team}.",
  "{team} has been the softest touch in the league lately, and {name} is walking right into it.",
  "This is exactly the kind of matchup {name}'s fantasy managers dream about.",
  "{name} versus {team} is about as close to a guaranteed lock as it gets.",
  "{team} has allowed points in bunches all year, and {name} is licking their chops.",
];
const MATCHUP_OUTLOOK_TOUGH = [
  "{name} faces a stingy {team} defense next week — expect a tougher outing.",
  "It won't be easy for {name} against a {team} unit that's been suffocating opponents.",
  "Buyer beware: {name} draws one of the league's better defenses in {team} next week.",
  "{name} will have to work for everything against a stout {team} defense.",
  "{team} has been a house of horrors for opposing players, and {name} is walking right into it.",
  "Temper expectations for {name} — {team} has been shutting people down all year.",
  "This is the kind of matchup where {name} could use a bench-worthy backup plan.",
  "{team} has quietly become one of the toughest defenses to game plan against, bad news for {name}.",
  "Don't expect fireworks from {name} this week — {team} has been lights out.",
  "{name} is walking into a defensive buzzsaw in {team} next week.",
  "History says {team} gives fits to players just like {name} — proceed with caution.",
];

const RETIRE_EVENTS = [
  "retired at halftime after realizing football kind of sucks",
  "retired mid-drive to pursue competitive knitting",
  "walked off the field, got in a taxi, and is now a chef",
  "announced retirement to focus on their podcast",
  "hung up the cleats to go be a gym leader",
  "quit on the spot to open a food truck",
  "retired to become a full-time golf influencer",
  "walked into the sunset, literally, during a day game",
  "retired to pursue a career in competitive eating",
  "hung it up to finally beat that one video game",
  "left mid-huddle to go start a llama farm",
  "retired to become a mall Santa full-time",
  "announced retirement via interpretive dance",
  "quit to open a chain of artisanal toast shops",
  "retired to focus full-time on fantasy football, ironically",
  "walked off to go be a substitute teacher",
  "retired to write a tell-all memoir nobody asked for",
  "hung up the cleats to become a cruise ship performer",
  "quit to pursue a black belt in competitive napping",
  "retired to start a podcast about retiring",
  "left to become a professional treasure hunter",
  "announced retirement live during the coin toss",
  "quit to open a very niche antique spoon store",
  "retired to finally learn the accordion",
  "walked away to become a weather balloon enthusiast",
  "bought a boat. nuff said",
  "they got him...",
];

const HIGHLIGHT_VERBS = {
  rush: [
    "bulldozes", "juke-steps", "slashes", "trucks somebody", "spins free", "waddles",
    "hurdles a linebacker", "stiff-arms his way through", "bounces off three tacklers", "high-steps into the end zone",
    "breaks a tackle and keeps churning", "weaves through traffic", "lowers the shoulder", "bounces outside",
    "cuts back against the grain", "stumbles forward for extra yards", "hops over a diving tackle", "drags a defender for extra yards",
    "explodes through the hole", "sidesteps a would-be tackler",
  ],
  pass: [
    "fires", "lofts", "zips", "flicks", "slings", "dimes",
    "airs it out", "drops a dime", "chucks it deep", "sidearms it", "no-looks it", "hits him in stride",
    "throws a frozen rope", "lasers it in", "arcs one up", "threads the needle", "flips it out wide", "guns it across the middle",
  ],
  catch: [
    "hauls it in", "snags it", "goes up and gets it", "reels it in", "bobbles then grabs it",
    "high-points it", "makes a diving grab", "toe-taps in bounds", "climbs the ladder for it", "cradles it in",
    "adjusts and secures it", "makes it look easy", "wills it away from the defender", "comes down with it",
    "hangs on through contact", "juggles it before securing it",
  ],
};

const DEF_NICK_PREFIX = ["The", "The", "The"];
const DEF_NICK_SUFFIX = ["Wall", "Swarm", "Vortex", "Crew", "Blitz Squad", "Chaos Unit"];

/* Coach decisions. mult scales the player's fantasy output, risk = post-game injury odds,
   swing = alternate mult picked on a coin flip, sit = player is done for the day. */
const PREGAME_DECISIONS = [
  {
    prompt: "{name} wants to wear a lucky sweatband that very clearly violates uniform policy.",
    options: [
      { label: "Wear it, king", mult: 1.18, text: "{name} struts out looking ridiculous and feeling immortal." },
      { label: "Rules are rules", mult: 0.92, text: "{name} sulks through warmups." },
    ],
  },
  {
    prompt: "{name} is begging for a season-high workload today. 'Just feed me, coach.'",
    options: [
      { label: "Feed him", mult: 1.25, risk: 0.14, text: "{name} is getting the ball until his legs fall off." },
      { label: "Keep it balanced", mult: 0.96, text: "{name} nods, disappointed." },
    ],
  },
  {
    prompt: "{name} asks, dead serious: 'Coach, am I your favorite player?'",
    options: [
      { label: "Absolutely, buddy", mult: 1.2, text: "{name} tears up and sprints onto the field." },
      { label: "You're top five", mult: 0.84, text: "{name} spends warmups doing the math." },
    ],
  },
  {
    prompt: "{name} has a sore ankle. Trainer says it's a coin flip.",
    options: [
      { label: "Send him out there", mult: 1.02, risk: 0.28, text: "{name} tapes it up and goes." },
      { label: "Limit the snaps", mult: 0.68, text: "{name} will be on a pitch count." },
    ],
  },
  {
    prompt: "{name} wants to call his own plays today. He has 'concepts'.",
    options: [
      { label: "Let him cook", mult: 1.35, swing: 0.7, text: "The playbook is now a napkin drawing." },
      { label: "Absolutely not", mult: 1, text: "{name} respects the chain of command. Barely." },
    ],
  },
  {
    prompt: "{name} is rattled because his ex is sitting in section 118.",
    options: [
      { label: "Turn it into fuel", mult: 1.16, text: "{name} is playing for petty reasons and that's the best kind." },
      { label: "Tell him to grow up", mult: 0.8, text: "{name} is now rattled AND annoyed." },
    ],
  },
  {
    prompt: "{name} ate fourteen waffles at the team hotel. He is very proud.",
    options: [
      { label: "Send him out", mult: 1.06, risk: 0.12, text: "There is a real chance this ends badly." },
      { label: "Sit him the first drive", mult: 0.82, text: "{name} digests in peace." },
    ],
  },
  {
    prompt: "{name} wants a pregame speech about the power of friendship.",
    options: [
      { label: "Deliver it, weeping", mult: 1.14, text: "There is not a dry eye in the tunnel." },
      { label: "Just say 'ball out'", mult: 1, text: "{name} shrugs and jogs off." },
    ],
  },
  {
    prompt: "{name} claims he can 'feel' that today is a four-touchdown day.",
    options: [
      { label: "Believe him", mult: 1.3, swing: 0.75, text: "We are all riding this vibe now." },
      { label: "Ask him to feel a first down instead", mult: 1.02, text: "Grounded expectations it is." },
    ],
  },
  {
    prompt: "The opposing defense mocked {name}'s Pokedex number on social media.",
    options: [
      { label: "Print it and tape it to his locker", mult: 1.22, text: "{name} has entered his villain era." },
      { label: "Let it go", mult: 1, text: "Very mature. Very boring." },
    ],
  },
  {
    prompt: "{name} wants to switch to a lucky, extremely mismatched pair of cleats.",
    options: [
      { label: "Let him wear them", mult: 1.15, text: "{name} looks unhinged and plays like it." },
      { label: "Make him match", mult: 0.95, text: "{name} complies, grumbling the whole time." },
    ],
  },
  {
    prompt: "{name} insists on doing a pregame TikTok dance for the fans.",
    options: [
      { label: "Let him dance", mult: 1.12, text: "The crowd loses it. {name} feeds off the energy." },
      { label: "Save it for after", mult: 1, text: "{name} nods and focuses up." },
    ],
  },
  {
    prompt: "{name} wants to skip stretching to save time for extra reps.",
    options: [
      { label: "Let him skip it", mult: 1.1, risk: 0.22, text: "{name} feels loose. Maybe too loose." },
      { label: "Stretch first", mult: 0.98, text: "Fundamentals win out." },
    ],
  },
  {
    prompt: "{name} swears a specific pregame meal is the reason for his last big game.",
    options: [
      { label: "Order it again", mult: 1.17, text: "Same meal, same magic, hopefully." },
      { label: "Mix it up", mult: 0.9, text: "{name} plays a little off his routine." },
    ],
  },
  {
    prompt: "{name} wants to wear his lucky (unwashed) undershirt again.",
    options: [
      { label: "Let him", mult: 1.2, text: "Nobody wants to get near him, but he's locked in." },
      { label: "Force a wash", mult: 0.94, text: "{name} feels 'off' but smells much better." },
    ],
  },
  {
    prompt: "{name} wants to call his grandma for a pep talk before kickoff.",
    options: [
      { label: "Make the call", mult: 1.19, text: "Grandma delivers. {name} is unstoppable now." },
      { label: "No phones allowed", mult: 1, text: "{name} respects the rule, quietly disappointed." },
    ],
  },
  {
    prompt: "{name} wants to switch jersey numbers with a teammate for good luck.",
    options: [
      { label: "Swap 'em", mult: 1.13, swing: 0.65, text: "Chaos in the equipment room, but why not." },
      { label: "Keep your own number", mult: 1, text: "Order is preserved. Barely interesting." },
    ],
  },
  {
    prompt: "{name} is convinced today's opponent 'owes him one' from a video game.",
    options: [
      { label: "Let the beef simmer", mult: 1.21, text: "{name} is playing like it's personal, because it is." },
      { label: "Remind him it's not real", mult: 0.93, text: "{name} deflates a little." },
    ],
  },
  {
    prompt: "{name} wants to lead warmups with a motivational movie speech.",
    options: [
      { label: "Let him have the floor", mult: 1.14, text: "Half the team is crying, the other half is fired up." },
      { label: "Stick to the script", mult: 1, text: "Business as usual." },
    ],
  },
  {
    prompt: "{name} wants to skip the team photo to keep his 'game face' on.",
    options: [
      { label: "Skip it", mult: 1.08, text: "{name} stays locked in, at the cost of team unity photos." },
      { label: "Smile for the camera", mult: 1, text: "{name} obliges, camera-ready and normal." },
    ],
  },
  {
    prompt: "{name} wants to warm up in the parking lot 'for the energy.'",
    options: [
      { label: "Let him", mult: 1.1, risk: 0.1, text: "{name} nearly gets hit by a golf cart but feels great." },
      { label: "Use the actual field", mult: 1, text: "{name} warms up like a normal person." },
    ],
  },
  {
    prompt: "{name} wants a specific song blasted before he runs out of the tunnel.",
    options: [
      { label: "Blast it", mult: 1.16, text: "{name} sprints out like he's main-eventing a wrestling show." },
      { label: "Keep the standard intro music", mult: 1, text: "{name} walks out, unbothered." },
    ],
  },
  {
    prompt: "{name} claims he can call today's coin toss with 100% accuracy.",
    options: [
      { label: "Let him call it", mult: 1.15, swing: 0.6, text: "The confidence alone is contagious." },
      { label: "Have the captain call it", mult: 1, text: "{name} pouts on the sideline." },
    ],
  },
  {
    prompt: "{name} wants to skip the pregame press questions entirely.",
    options: [
      { label: "Let him duck the media", mult: 1.05, text: "{name} stays zoned in, reporters mildly annoyed." },
      { label: "Make him answer three questions", mult: 0.93, text: "{name} gives the blandest answers imaginable." },
    ],
  },
  {
    prompt: "{name} insists on high-fiving literally every teammate before kickoff.",
    options: [
      { label: "Let the ritual happen", mult: 1.13, text: "Team chemistry, but it takes forever." },
      { label: "Cut it short", mult: 1, text: "Efficient. Slightly less magical." },
    ],
  },
];

const MIDGAME_DECISIONS = [
  {
    prompt: "{name} wants out. He just told the sideline reporter that football 'kind of sucks, actually.'",
    options: [
      { label: "Talk him into staying", mult: 1.05, risk: 0.2, text: "{name} sighs and buckles the chinstrap." },
      { label: "Let him sit", sit: true, text: "{name} is done for the day. He seems happier." },
    ],
  },
  {
    prompt: "{name} tweaked something. The trainer's face says 60/40.",
    options: [
      { label: "Gut it out", mult: 1.08, risk: 0.35, text: "{name} is going back in. Fingers crossed." },
      { label: "Shut him down", sit: true, text: "{name} is in a hoodie on the bench. Smart. Boring. Smart." },
    ],
  },
  {
    prompt: "{name} is nose-to-nose with an official and one word away from an ejection.",
    options: [
      { label: "Let him cook", mult: 1.28, swing: 0.5, text: "This is either inspiring or catastrophic." },
      { label: "Pull him aside", mult: 0.97, text: "Crisis averted. Adrenaline wasted." },
    ],
  },
  {
    prompt: "{name} is cramping up so badly he's doing the worm involuntarily.",
    options: [
      { label: "IV and send him back", mult: 1.03, risk: 0.16, text: "Pickle juice. Lots of pickle juice." },
      { label: "Sit him", sit: true, text: "{name} stretches dramatically for the cameras." },
    ],
  },
  {
    prompt: "{name}'s high school crush just texted him at halftime. He's staring at his phone.",
    options: [
      { label: "Let him reply", mult: 1.24, text: "He hit send. He is FLOATING." },
      { label: "Confiscate the phone", mult: 0.88, text: "{name} plays the second half distracted and bitter." },
    ],
  },
  {
    prompt: "{name} wants to switch positions for the second half. He 'has a feeling.'",
    options: [
      { label: "Roll with it", mult: 1.5, swing: 0.55, text: "The coordinator has left the booth." },
      { label: "Stay in your lane", mult: 1, text: "{name} accepts his role, resentfully." },
    ],
  },
  {
    prompt: "A fan in the front row has been heckling {name} by name for two quarters.",
    options: [
      { label: "Point him out to the whole team", mult: 1.2, text: "The bench is now personally invested." },
      { label: "Ignore it", mult: 1, text: "Professionalism. Gross." },
    ],
  },
  {
    prompt: "{name} wants to attempt a trick play he saw in a movie.",
    options: [
      { label: "Green light", mult: 1.4, swing: 0.6, text: "Nobody on the field knows what's about to happen." },
      { label: "Red light", mult: 1, text: "The movie play stays in the movie." },
    ],
  },
  {
    prompt: "{name} says the other team keeps calling him by the wrong Pokemon name.",
    options: [
      { label: "Tell him to make them learn it", mult: 1.18, text: "They're about to learn it." },
      { label: "Tell him names don't matter", mult: 0.95, text: "{name} disagrees, visibly." },
    ],
  },
  {
    prompt: "{name} is 6 yards from a personal record and wants every touch the rest of the way.",
    options: [
      { label: "Ride him", mult: 1.22, risk: 0.18, text: "Stat-padding is a love language." },
      { label: "Spread it around", mult: 0.94, text: "{name} will remember this." },
    ],
  },
  {
    prompt: "{name} wants to call an audible he definitely did not clear with the coordinator.",
    options: [
      { label: "Let it ride", mult: 1.3, swing: 0.55, text: "Nobody knows what's happening, including {name}." },
      { label: "Shut it down", mult: 1, text: "Back to the actual playbook." },
    ],
  },
  {
    prompt: "{name} is jawing with the opposing sideline and it's getting personal.",
    options: [
      { label: "Let him talk his talk", mult: 1.18, text: "{name} is fueled entirely by spite now." },
      { label: "Tell him to focus", mult: 0.95, text: "{name} bites his tongue, mostly." },
    ],
  },
  {
    prompt: "{name} wants a specific Gatorade flavor or he's 'not feeling it.'",
    options: [
      { label: "Find the flavor", mult: 1.1, text: "Crisis averted. {name} is refreshed and ready." },
      { label: "Tell him to deal with it", mult: 0.9, text: "{name} sips grape and seethes." },
    ],
  },
  {
    prompt: "{name} thinks he spotted a tell in the defense's formation.",
    options: [
      { label: "Trust the read", mult: 1.25, swing: 0.5, text: "{name} is either a genius or very wrong." },
      { label: "Stick to the game plan", mult: 1, text: "Boring, but safe." },
    ],
  },
  {
    prompt: "{name} wants to call his shot for the rest of the game.",
    options: [
      { label: "Let him guarantee it", mult: 1.22, text: "{name} is playing with house money now." },
      { label: "Keep expectations quiet", mult: 1, text: "{name} plays it cool, less fun." },
    ],
  },
  {
    prompt: "{name} is convinced the ref has been counting his steps out loud.",
    options: [
      { label: "Let him vent to the ref", mult: 1.05, risk: 0.1, text: "{name} gets it off his chest, barely." },
      { label: "Redirect the energy", mult: 1.1, text: "{name} channels the frustration into the next play." },
    ],
  },
  {
    prompt: "{name} wants to switch which hand he holds the ball in 'for balance.'",
    options: [
      { label: "Let him experiment", mult: 1.08, risk: 0.15, text: "This is either genius or a fumble waiting to happen." },
      { label: "Keep it standard", mult: 1, text: "{name} sticks with what works." },
    ],
  },
  {
    prompt: "{name} says he needs a specific song stuck in his head to keep going.",
    options: [
      { label: "Hum it for him", mult: 1.12, text: "{name} is now unstoppable and humming." },
      { label: "Tell him to focus on football", mult: 0.97, text: "{name} tries, but the silence is deafening." },
    ],
  },
  {
    prompt: "{name} wants to call out the other team's star player by name, loudly.",
    options: [
      { label: "Let him talk trash", mult: 1.2, text: "{name} has made this personal, for better or worse." },
      { label: "Keep it professional", mult: 1, text: "{name} nods, unsatisfied." },
    ],
  },
  {
    prompt: "{name} thinks he can psych out the kicker before a big field goal.",
    options: [
      { label: "Let him try", mult: 1.1, swing: 0.45, text: "Mind games are in full effect." },
      { label: "Focus on your own job", mult: 1, text: "{name} minds his business, mostly." },
    ],
  },
  {
    prompt: "{name} wants a mid-game pep talk from the mascot.",
    options: [
      { label: "Send in the mascot", mult: 1.14, text: "{name} gets a weird, oddly effective pep talk." },
      { label: "Keep the mascot on the sideline", mult: 1, text: "{name} shrugs it off." },
    ],
  },
  {
    prompt: "{name} is convinced his cleats are untied even though they aren't.",
    options: [
      { label: "Let him double check", mult: 1, risk: 0.05, text: "Wasted thirty seconds, feels better though." },
      { label: "Tell him they're fine", mult: 1.05, text: "{name} trusts the coach and moves on." },
    ],
  },
  {
    prompt: "{name} wants to switch to no-huddle offense on his own.",
    options: [
      { label: "Let him speed things up", mult: 1.28, swing: 0.5, text: "Chaos, but fast chaos." },
      { label: "Slow it back down", mult: 1, text: "{name} reluctantly resets the tempo." },
    ],
  },
  {
    prompt: "{name} says he can feel a big play coming 'in his bones.'",
    options: [
      { label: "Ride the vibes", mult: 1.24, swing: 0.55, text: "The bones have spoken." },
      { label: "Stick to the stats", mult: 1.02, text: "{name} respects the numbers, begrudgingly." },
    ],
  },
  {
    prompt: "{name} wants to call a timeout just to catch his breath.",
    options: [
      { label: "Burn the timeout", mult: 1.05, text: "{name} gets his wind back, coordinator gets annoyed." },
      { label: "Push through", mult: 0.96, risk: 0.12, text: "{name} gasses out a little." },
    ],
  },
];

const CPU_DECISION_FLAVOR = [
  "went with their gut",
  "consulted a spreadsheet",
  "flipped a coin",
  "asked the equipment manager",
  "did whatever the analytics said",
  "asked a Magic 8-Ball",
  "went with whatever felt right in the moment",
  "deferred to the intern",
  "let the mascot decide",
  "consulted a fortune cookie",
  "went with their pregame horoscope",
  "asked the water boy for his opinion",
  "trusted the vibes completely",
  "went with the bold choice",
  "played it safe, as always",
  "let the team vote on it",
  "consulted an old scouting report",
  "went with whatever the crowd was chanting",
  "followed a hunch from film study",
  "just wung it",
];
