import { createClient } from "@supabase/supabase-js";

const topics = {
  "Dating and Relationships": [
    "making a first impression",
    "planning a thoughtful date",
    "choosing a good conversation starter",
    "noticing a relationship green flag",
    "sharing a funny dating story",
    "describing an ideal weekend together",
    "talking about personal values",
    "showing appreciation to a partner",
    "building trust over time",
    "deciding what makes a date memorable",
  ],
  "Funny and Silly": [
    "telling an awkward but harmless story",
    "inventing a ridiculous excuse",
    "choosing an unusual food combination",
    "giving an ordinary object a personality",
    "remembering a funny childhood belief",
    "making up a silly superstition",
    "describing an embarrassing autocorrect",
    "imagining a very strange talent",
    "creating a ridiculous movie plot",
    "laughing at a harmless mistake",
  ],
  "Sports and Fitness": [
    "trying a new sport",
    "celebrating a personal fitness win",
    "choosing a fun way to stay active",
    "recovering after a tough workout",
    "being a supportive teammate",
    "watching an exciting match",
    "learning a new physical skill",
    "doing a low-pressure group activity",
    "remembering a funny sports moment",
    "making a team celebration",
  ],
  Education: [
    "learning something outside a classroom",
    "remembering a favorite school subject",
    "asking a question in class",
    "getting helpful advice from a teacher",
    "learning from a small mistake",
    "choosing a skill to learn next",
    "preparing for a presentation",
    "helping someone understand a topic",
    "revisiting an old school memory",
    "explaining a surprising fact",
  ],
  Friends: [
    "making a new friend",
    "showing appreciation to a friend",
    "planning a group activity",
    "sharing a funny group memory",
    "supporting a friend through a hard day",
    "choosing a thoughtful small gift",
    "resolving a harmless misunderstanding",
    "starting a conversation with someone new",
    "creating a group tradition",
    "describing a quality you value in a friend",
  ],
  "Movies & Entertainment": [
    "choosing a favorite movie genre",
    "watching a film with friends",
    "picking a memorable soundtrack",
    "recommending a show",
    "meeting a favorite fictional character",
    "acting in a comedy scene",
    "rewatching a childhood favorite",
    "choosing a movie ending",
    "attending a live performance",
    "describing a memorable plot twist",
  ],
  Couples: [
    "planning a relaxed date night",
    "sharing a small daily ritual",
    "remembering a funny moment together",
    "giving a sincere compliment",
    "choosing a new activity to try together",
    "talking about how you show appreciation",
    "making a shared playlist",
    "planning a low-cost date",
    "celebrating a small win together",
    "describing a favorite shared memory",
  ],
  "Party Night": [
    "choosing a party playlist",
    "starting a friendly group game",
    "meeting someone new at a gathering",
    "bringing a favorite snack to share",
    "choosing a fun party theme",
    "dancing to a favorite song",
    "making a toast to the group",
    "posing for a silly group photo",
    "planning a comfortable celebration",
    "telling a funny party story",
  ],
  "Night Out": [
    "choosing a place to meet friends",
    "planning a safe evening out",
    "finding a new local café",
    "taking an evening walk with company",
    "choosing a live event",
    "planning a low-key outing",
    "finding a late-night snack",
    "making a memorable evening playlist",
    "choosing a group activity",
    "getting home safely after an outing",
  ],
  "Risky Texts": [
    "rewriting a message before sending it",
    "dealing with an autocorrect mistake",
    "choosing an emoji for a conversation",
    "sending a friendly invitation",
    "waiting for a reply",
    "writing a message to an old friend",
    "deciding whether a joke will land",
    "sending a thoughtful check-in",
    "starting a conversation by text",
    "keeping a private message private",
  ],
  Football: [
    "watching a close football match",
    "choosing a favorite player",
    "celebrating a goal",
    "playing in a friendly match",
    "supporting a team after a loss",
    "choosing a football position",
    "joining a match-day crowd",
    "learning a new football skill",
    "remembering a dramatic finish",
    "creating a respectful team chant",
  ],
};

const truthTemplates = [
  "What's one thing you enjoy about {item}?",
  "What's your funniest memory involving {item}?",
  "What would you change about {item} if you could?",
  "How has your opinion of {item} changed over time?",
  "What advice would you give someone about {item}?",
  "Which detail about {item} do you notice first?",
  "When does {item} make you feel most confident?",
  "What's something unexpected you've learned from {item}?",
  "What would you try differently next time with {item}?",
  "How would you describe {item} in three words?",
];

const dareTemplates = [
  "Give a 10-second opinion about {item}.",
  "Act out a moment involving {item} without speaking.",
  "Invent a movie title inspired by {item}.",
  "Explain {item} like a dramatic sports commentator.",
  "Create a short slogan about {item}.",
  "Describe {item} using exactly three adjectives.",
  "Tell a 10-second fictional story involving {item}.",
  "Give an imaginary award for {item}.",
  "Pitch {item} like it is the best new idea of the year.",
  "Choose a song that fits {item} and explain your pick.",
];

const adultTruthContexts = [
  "talking about intimacy",
  "setting boundaries around physical affection",
  "sharing what helps you feel desired",
  "communicating what feels comfortable",
  "asking a partner for consent",
  "discussing sexual health with a partner",
  "sharing a romantic fantasy without details",
  "building trust before becoming intimate",
  "talking about attraction",
  "receiving a suggestive compliment",
  "giving a partner an honest check-in",
  "deciding when you feel ready to get closer",
  "saying no when something does not feel right",
  "talking about preferences without pressure",
  "keeping private details confidential",
  "making a first move respectfully",
  "flirting while reading the other person's cues",
  "talking about what makes you feel confident",
  "discussing a partner's comfort level",
  "choosing the pace of a romantic relationship",
  "asking what kind of affection is welcome",
  "talking about a boundary that matters to you",
  "describing what makes a date feel intimate",
  "checking in when a partner seems unsure",
  "talking openly about a change of mind",
  "deciding what you prefer to keep private",
  "a harmless romantic habit your friends tease you about",
  "talking about the role of trust in sex",
  "describing what makes you feel emotionally close",
  "asking for reassurance from someone you trust",
  "sharing how you like to receive affection",
  "talking about a romantic turn-on in general terms",
  "discussing how to pause an intimate moment",
  "asking a partner what they are comfortable with",
  "making sure a flirty joke is welcome",
  "talking about privacy before sharing intimate details",
  "explaining what helps you relax on a date",
  "discussing mutual enthusiasm",
  "a time you missed an obvious flirting cue",
  "a cheesy romantic line you secretly enjoy",
];

const adultTruthTemplates = [
  "What helps you feel comfortable discussing {context}?",
  "How would you describe your comfort level with {context}?",
  "What's one boundary you consider important around {context}?",
  "What would you want a partner to understand about {context}?",
  "What helps you feel confident about {context}?",
  "How could a partner check in with you about {context}?",
  "What's a respectful way to start a conversation about {context}?",
  "How have your views on {context} changed over time?",
  "What question would you feel comfortable asking about {context}?",
  "Which part of {context} feels easiest to communicate about?",
  "Which part of {context} takes trust for you to talk about?",
  "What misconception do you wish people avoided about {context}?",
  "How important is humor when discussing {context}?",
  "What would make {context} feel more comfortable to discuss?",
  "How do you prefer to communicate your limits around {context}?",
  "How can people make conversations about {context} pressure-free?",
  "What makes a conversation about {context} feel respectful?",
  "What is one thing you have learned about {context}?",
  "How would you explain the importance of consent in {context}?",
  "What kind of check-in feels natural when discussing {context}?",
  "What makes it easier to be honest about {context}?",
  "What is a gentle way to change the subject from {context}?",
  "How can someone show they are listening when you discuss {context}?",
  "What would help you feel heard when talking about {context}?",
  "What is one pressure-free way to talk about {context}?",
];

const adultDareContexts = [
  "a playful compliment",
  "a fictional first date",
  "a romantic movie scene",
  "a flirty but respectful text",
  "a cozy evening for two",
  "a fictional crush",
  "a charming conversation starter",
  "a romantic playlist",
  "a sweet goodnight message",
  "a confident introduction",
  "a respectful way to ask someone out",
  "a fictional slow dance",
  "a romantic surprise that respects boundaries",
  "a cute date invitation",
  "a fictional couple's inside joke",
  "a gentle consent check-in",
  "a respectful way to ask before a kiss",
  "a playful dating-show introduction",
  "a romantic scene set in a café",
  "a fictional anniversary plan",
  "a charming line for an imaginary character",
  "a thoughtful way to show affection",
  "a flirty scene from a made-up film",
  "a fictional love letter that stays private",
  "a romantic compliment about someone's personality",
  "a respectful way to accept a boundary",
  "a playful invitation to a pretend date",
  "a fictional candlelit dinner",
  "a sweet message to an imaginary partner",
  "a romantic moment in a comedy",
  "a confident but kind dating profile",
  "an affectionate nickname for a fictional couple",
  "a respectful way to pause a romantic moment",
  "a date idea that feels relaxed and safe",
  "a fictional meet-cute",
  "a sincere expression of attraction",
  "a romantic scene without any dialogue",
  "a compliment that is not about appearance",
  "a fictional flirty voice message",
  "a fictional kiss scene described without physical detail",
];

const adultDareTemplates = [
  "Invent a fictional, mildly flirty line about {context}; direct it to an imaginary character.",
  "Write a playful invitation about {context}, but do not send it.",
  "Describe {context} in a 10-second movie-trailer voice.",
  "Pitch {context} as a date idea in 10 seconds.",
  "Give a mock award speech for {context}.",
  "Hum a tune that would fit {context}.",
  "Name one consent check-in that could make {context} feel comfortable.",
  "Choose one word for {context} and explain why you chose it.",
  "Make up a lighthearted slogan for {context}.",
  "Act out {context} using gestures only; do not touch anyone.",
  "Offer an imaginary partner a respectful compliment about {context}.",
  "Invent a fictional emoji combination for {context}.",
  "Describe {context} as if you are hosting a romantic radio show.",
  "Create a three-word title for a fictional story about {context}.",
  "Give {context} a playful review, keeping it kind and non-explicit.",
  "Suggest one pressure-free way a fictional couple could approach {context}.",
  "Narrate {context} like a dramatic scene from a romantic comedy.",
  "Turn {context} into a friendly, fictional text; keep it unsent.",
  "Name a song genre that suits {context} and give one reason.",
  "Describe how a fictional character could ask consent around {context}.",
  "Create a short toast celebrating {context}.",
  "Explain {context} like a charming date-night host.",
  "Make up a gentle, funny opening line about {context}.",
  "Give {context} a rating out of ten and explain your imaginary review.",
  "Describe {context} in a way that emphasizes mutual comfort.",
];

const rows = [];
for (const [topic, items] of Object.entries(topics)) {
  for (const item of items) {
    for (const template of truthTemplates) {
      rows.push({
        topic,
        kind: "truth",
        adult: false,
        prompt: template.replace("{item}", item),
        enabled: true,
      });
    }
    for (const template of dareTemplates) {
      rows.push({
        topic,
        kind: "dare",
        adult: false,
        prompt: template.replace("{item}", item),
        enabled: true,
      });
    }
  }
}

for (const context of adultTruthContexts) {
  for (const template of adultTruthTemplates) {
    rows.push({
      topic: "All",
      kind: "truth",
      adult: true,
      prompt: template.replace("{context}", context),
      enabled: true,
    });
  }
}
for (const context of adultDareContexts) {
  for (const template of adultDareTemplates) {
    rows.push({
      topic: "All",
      kind: "dare",
      adult: true,
      prompt: template.replace("{context}", context),
      enabled: true,
    });
  }
}

const groups = new Map();
for (const row of rows) {
  const key = `${row.topic}|${row.kind}|${row.adult}`;
  groups.set(key, (groups.get(key) ?? 0) + 1);
}
const duplicateKeys = new Set();
const distinctRows = rows.filter((row) => {
  const key = `${row.topic}|${row.kind}|${row.adult}|${row.prompt}`;
  if (duplicateKeys.has(key)) return false;
  duplicateKeys.add(key);
  return true;
});

if (distinctRows.length !== 4_200) {
  throw new Error(`Expected 4,200 distinct prompts; generated ${distinctRows.length}.`);
}
for (const topic of Object.keys(topics)) {
  if (groups.get(`${topic}|truth|false`) !== 100 || groups.get(`${topic}|dare|false`) !== 100) {
    throw new Error(`Unexpected regular prompt counts for ${topic}.`);
  }
}
if (groups.get("All|truth|true") !== 1_000 || groups.get("All|dare|true") !== 1_000) {
  throw new Error("Unexpected adult prompt counts.");
}

if (process.argv.includes("--check")) {
  console.log("Verified 100 truths and 100 dares for each of 11 topics.");
  console.log("Verified 1,000 adult truths and 1,000 adult dares.");
  console.log("All 4,200 prompts are unique within their topic/type/adult group.");
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let inserted = 0;
for (let offset = 0; offset < distinctRows.length; offset += 100) {
  const batch = distinctRows.slice(offset, offset + 100);
  const { data, error } = await supabase
    .from("prompts")
    .upsert(batch, {
      onConflict: "topic,kind,adult,prompt",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) {
    throw new Error(`Failed to seed batch ${Math.floor(offset / 100) + 1}: ${error.message}`);
  }
  inserted += data.length;
  console.log(`Processed ${Math.min(offset + batch.length, distinctRows.length)} / ${distinctRows.length}`);
}
console.log(`Seed complete. Added ${inserted} prompts; existing matching prompts were left unchanged.`);
