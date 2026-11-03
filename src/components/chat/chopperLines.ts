// What Chopper says. Written by hand, so it costs no model requests and works offline.

export const GREETING = "Hi! I'm Chopper, Luno's doctor on duty. Ask me anything!";

export const FACTS = [
  "Fun fact: reindeer are the only deer where both males and females grow antlers.",
  "Fun fact: reindeer eyes turn from golden in summer to blue in winter.",
  "Fun fact: a reindeer's knees click as it walks, a sound that may help the herd stay together in the dark.",
  "Fun fact: octopuses have three hearts.",
  "Fun fact: sealed honey can last for thousands of years without spoiling.",
  "Fun fact: bananas are berries, but strawberries are not.",
  "Fun fact: wombat droppings are cube-shaped.",
  "Fun fact: a day on Venus is longer than its year.",
  "Fun fact: sharks are older than trees.",
  "Fun fact: hummingbirds can fly backwards.",
  "Fun fact: sea otters hold hands while they sleep so they don't drift apart.",
  "Fun fact: lightning is several times hotter than the surface of the sun.",
  "Fun fact: a group of flamingos is called a flamboyance.",
  "Fun fact: the shortest war on record, between Britain and Zanzibar in 1896, lasted under an hour.",
];

export const TECH_FACTS = [
  "Fun fact: the first computer \"bug\" was a real moth, found in a Harvard computer in 1947.",
  "Fun fact: the world's first website is still online at info.cern.ch.",
  "Fun fact: JavaScript was first written in about ten days, by Brendan Eich in 1995.",
  "Fun fact: Git was created by Linus Torvalds in 2005 to manage the Linux kernel.",
  "Fun fact: a 1980 one-gigabyte hard drive weighed more than 500 pounds.",
  "Fun fact: there are more possible chess games than atoms in the observable universe.",
];

export const NATURE_FACTS = [
  "Fun fact: butterflies taste with their feet.",
  "Fun fact: axolotls can regrow lost limbs.",
  "Fun fact: bananas are slightly radioactive, thanks to potassium.",
  "Fun fact: Antarctica is technically a desert.",
  "Fun fact: dolphins sleep with half of their brain awake.",
  "Fun fact: a mantis shrimp punches with the force of a bullet.",
  "Fun fact: cows have best friends and get stressed when they are apart.",
  "Fun fact: the Eiffel Tower grows taller in summer, because the metal expands in the heat.",
];

export const ONE_PIECE_FACTS = [
  "One Piece fact: Eiichiro Oda started the manga in 1997 in Weekly Shonen Jump.",
  "One Piece fact: it holds the Guinness record for most copies published for a comic series by one author.",
  "One Piece fact: I ate the Human-Human Fruit, which is why I can talk and walk on two legs!",
  "One Piece fact: my dream is to become a doctor who can cure any disease.",
  "One Piece fact: Dr. Kureha made my Rumble Ball. It lets me switch forms, like Heavy Point or Brain Point.",
  "One Piece fact: the Thousand Sunny, the Straw Hats' ship, has a lion for a figurehead.",
  "One Piece fact: Devil Fruit users sink in water. That's why Luffy never swims!",
  "One Piece fact: I joined the Straw Hats on Drum Island, where Dr. Kureha lives.",
  "One Piece fact: cotton candy is my favourite treat. It's not medicine, but it works on me!",
];

export const JOKES = [
  "Joke: why did Zoro bring a map? To double-check he was lost in the right direction.",
  "Joke: Luffy asked Sanji which snack he wanted. Luffy said, \"Yes.\"",
  "Joke: Nami charged me a hundred thousand berries for this joke. Worth it!",
  "Joke: Usopp says he fought 8,000 bugs today. The log says one. It was a moth.",
  "Joke: what's Brook's favourite chat app? One with lots of rib-sponses! Yohoho!",
  "Joke: Franky says my code is SUPER. My bugs are not.",
  "Joke: Sanji spotted a bug in the code and got a nosebleed. It was a very pretty bug.",
  "Joke: I'm not a tanuki! I'm a reindeer doctor! ...a cute one. Don't tell anyone I said that.",
  "Joke: Zoro took the shortcut. We'll see him again next Tuesday.",
  "Joke: Luffy wants to be King of the Pirates. I just want to be king of the pillow fort.",
  "Joke: why did I bring a stethoscope to code review? To check the pulse of the repo!",
  "Joke: \"Is there a doctor?!\" Yes! Me! Why is everyone always so surprised?",
];

export const THOUGHTS = [
  "Hmm, I wonder if clouds feel fluffy from the inside.",
  "Doctor's orders: drink some water!",
  "Don't call me cute, jerk! *happy dance*",
  "Stretch your shoulders. I'm a doctor, I know these things!",
  "If you're stuck, explain it out loud. Works on reindeer too.",
  "Cotton candy is technically a snack and technically medicine. Probably.",
  "Every bug is just a patient waiting for a diagnosis.",
  "I wonder what snow tastes like on other planets.",
  "Take a break soon. Even good doctors rest!",
  "What if socks are just tiny shoes for feet's feet?",
  "Big ideas start as small questions. Go on, ask!",
  "Hehe, I'm sitting right here. Don't mind me!",
];

/** What he says while Luno is working on a reply. */
export const WORKING = ["Luno is on the case!", "Hold still, the doctor is thinking...", "Diagnosis coming right up!", "Rumble... rumble... almost there!"];

/** A line that is not the previous one, so the bubble never repeats itself. */
export function nextLine(previous: string | null): string {
  const pool = [...FACTS, ...TECH_FACTS, ...NATURE_FACTS, ...ONE_PIECE_FACTS, ...JOKES, ...THOUGHTS].filter((line) => line !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}
