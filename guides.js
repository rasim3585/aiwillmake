// Guides served at /guides/:slug (English) and /rehber/:slug (Turkish), rendered by server.js.
// Every guide serves the one purpose of the product: someone you have lost.
// Real, useful content first; the product is offered gently as a next step.
// Body/answer strings are trusted HTML authored here (no user input).

module.exports = [
  // ─────────────────────────────── English ───────────────────────────────
  {
    lang: 'en',
    slug: 'save-text-messages-from-someone-who-died',
    title: 'How to Save Text Messages From a Loved One Who Died (iPhone, Android, WhatsApp)',
    description: 'A gentle, practical guide to keeping the texts, WhatsApp chats and voicemails of someone you lost — on iPhone, Android and WhatsApp — before anything gets deleted.',
    h1: 'How to save text messages from a loved one who died',
    intro: 'Their messages are often the closest thing we have to their voice: the way they signed off, the jokes only you two had, the last "love you" before a call. Phones get replaced, accounts close and chats get deleted. Here is how to keep those words safe, step by step, at your own pace.',
    sections: [
      { h: 'First: don\'t reset or switch anything yet', body: '<ul><li><b>Don\'t factory-reset their phone</b> or yours, and don\'t sign out of messaging apps until you have a backup.</li><li><b>Keep their phone charged</b> and, if you can, keep their number active for a while. Messages and verification codes are tied to it.</li><li><b>Turn off auto-delete:</b> on iPhone, Settings → Messages → Keep Messages → Forever. In WhatsApp, check that disappearing messages are off for your chat.</li></ul>' },
      { h: 'iPhone (iMessage and SMS)', body: '<ol><li><b>Back up the phone</b> to iCloud (Settings → your name → iCloud → iCloud Backup) or to a computer. A full backup includes the Messages history.</li><li><b>Screenshot what matters most.</b> It is low-tech but permanent: long-press a message bubble to see the date, and capture the conversations you can\'t bear to lose.</li><li><b>On a Mac</b>, the Messages app keeps the same history when you sign in with the same Apple ID; you can select and copy text from there into a document.</li><li>Paid desktop tools can export whole iMessage threads as PDF or text if you want a complete archive.</li></ol>' },
      { h: 'Android (SMS)', body: '<ol><li>Use a backup app such as <i>SMS Backup &amp; Restore</i> to save texts to a file or to your cloud storage.</li><li>Google One / Google backup also keeps SMS if it was turned on in Settings → Google → Backup.</li><li>Screenshots work here too for the messages that matter most.</li></ol>' },
      { h: 'WhatsApp', body: '<ol><li>Open your chat with them and tap their name (iPhone) or ⋮ → More (Android).</li><li>Choose <b>Export chat</b> → <b>Without media</b> for the text, or include media to keep their photos and voice notes.</li><li>Save the file to your Files app, cloud storage or email it to yourself.</li></ol><p>Voice notes are often the most precious part: export with media, or save individual voice notes by long-pressing them and choosing Share.</p>' },
      { h: 'Voicemails', body: '<p>On iPhone, open the voicemail in the Phone app, tap the share icon and save it to Files or Voice Memos. On Android, most phone apps let you save or share a voicemail as an audio file. Carriers may delete old voicemails automatically, so this is worth doing early.</p>' },
      { h: 'When you\'re ready', body: '<p>Some people simply keep these words in a folder and read them now and then. Others want to hear something back. If you ever want to, you can bring their messages into aiwillmake and talk with an AI reflection that writes the way they did — a space for the things you never got to say. It is not them, and it never claims to be.</p>' },
    ],
    cta: { text: 'Talk with a reflection of them →', href: '/app.html?import=1&mode=whatsapp&ref=guide-save-texts', note: 'Free to begin. Private to you. Delete everything anytime.' },
    faq: [
      { q: 'Will messages disappear if I cancel their phone number?', a: 'Messages already on a device or in a backup stay, but new messages, verification codes and some services tied to the number will stop. Back everything up before cancelling, and consider keeping the number active for a while.' },
      { q: 'Can I get messages from their phone if I don\'t know the passcode?', a: 'Usually not without the passcode; Apple and Google offer legacy-contact and inactive-account features that you can set up in advance, and they may help families in some cases through their official processes.' },
      { q: 'What\'s the simplest way to keep a few important messages?', a: 'Screenshots. They take seconds, include the date if you capture it, and can be stored anywhere.' },
    ],
  },
  {
    lang: 'en',
    slug: 'letter-to-someone-who-died',
    title: 'How to Write a Letter to Someone Who Died (With Prompts to Begin)',
    description: 'Why writing a letter to a loved one who died can help, how to start, and gentle prompts for what to say — plus what to do with the letter afterwards.',
    h1: 'How to write a letter to someone who died',
    intro: 'Grief often leaves words with nowhere to go: a thank-you, an apology, news they never got to hear, a goodbye. Many grief counselors suggest writing a letter to the person you lost. It doesn\'t need to be perfect, and it doesn\'t need a reader. Here is a gentle way to begin.',
    sections: [
      { h: 'Why it can help', body: '<p>Writing slows down feelings that are hard to hold all at once. Putting them into words gives them a shape and a place. A letter is also a way of remembering: the act of writing to them keeps the relationship part of your story.</p>' },
      { h: 'How to begin', body: '<ul><li><b>Start the way you used to address them:</b> "Dear Dad", "Hi Mom", "Grandpa"…</li><li><b>Open with a memory:</b> a smell, a phrase they always said, an ordinary day you now miss.</li><li><b>Say the unsaid thing:</b> what you are grateful for, what you are sorry for, what you wish you had told them.</li><li><b>Tell them your news:</b> what has changed since they have been gone, what they would be proud of.</li><li><b>Close in your own words:</b> a goodbye, a promise, or simply "I miss you".</li></ul>' },
      { h: 'Prompts if you\'re stuck', body: '<ul><li>"The last time we talked, I wish I had said…"</li><li>"Something you taught me that I still use is…"</li><li>"You would laugh if you knew that…"</li><li>"I\'m sorry that…"</li><li>"Thank you for…"</li></ul>' },
      { h: 'After you write it', body: '<p>Some people keep the letter, read it aloud at the grave or a meaningful place, or share it with someone who knew them too. There is no right way. If writing becomes too heavy, take a break — this is not a task.</p>' },
      { h: 'If you want to hear something back', body: '<p>On aiwillmake you can describe them in three answers, write them your letter, and read a reply written in their voice, built only from your memories. It is not them — it is a reflection, a space to say what you never got to say. If grief feels like too much, please talk to someone you trust; in the US you can call or text 988 any time.</p>' },
    ],
    cta: { text: 'Write them a letter →', href: '/app.html?import=1&mode=describe&ref=guide-letter', note: 'Free to begin. An AI reflection from your memories — not them.' },
    faq: [
      { q: 'Is it normal to write letters to someone who died?', a: 'Yes. Writing to a person you lost is a common and widely recommended way to express grief and the things left unsaid.' },
      { q: 'What should I do with the letter?', a: 'Whatever feels right: keep it, read it aloud somewhere meaningful, share it, or write another one later. There is no right answer.' },
    ],
  },
  {
    lang: 'en',
    slug: 'talk-to-a-loved-one-who-died-with-ai',
    title: 'Talking to a Loved One Who Died With AI: What It Is — and What It Isn\'t',
    description: 'An honest explainer: how AI "grief tech" that lets you talk with a reflection of someone you lost works, who it helps, the risks, and the safeguards to look for.',
    h1: 'Talking to a loved one who died with AI: what it is, and what it isn\'t',
    intro: 'AI can now write in the style of a specific person using their messages or your memories of them. Some people find it comforting to "hear" from someone they lost; others find the idea unsettling. Both reactions are reasonable. This guide explains honestly how it works and what to look for.',
    sections: [
      { h: 'How it works', body: '<p>You give the AI material about the person: how they talked, what they called you, things they often said, and sometimes the actual messages you exchanged. The AI uses that to write replies in a similar style. It does not know anything you didn\'t provide, and it is not the person — it is a reflection of your memories and their words.</p>' },
      { h: 'Who it can help', body: '<ul><li>People who never got to say goodbye, or who have words left unsaid.</li><li>People who want to tell someone about life since they\'ve been gone — a graduation, a wedding, a new baby.</li><li>People who find writing a letter easier when something writes back.</li></ul>' },
      { h: 'The risks — honestly', body: '<ul><li><b>It isn\'t them.</b> A good service says so clearly and never pretends otherwise.</li><li><b>It can feel too real</b> and make it harder to step away. Short, meaningful conversations tend to help more than constant use.</li><li><b>Privacy:</b> you are sharing intimate memories and messages. Check how they are stored and whether you can delete them.</li></ul>' },
      { h: 'Safeguards to look for', body: '<ul><li>Clear statements that you are talking to an AI, not the person.</li><li>No claims about an afterlife, no promises of a reunion.</li><li>Crisis support: if you express thoughts of harming yourself, it should step out of the role and point you to real help (in the US, call or text 988).</li><li>No sales pitches in the person\'s voice.</li><li>Full deletion, at any time. Adults only.</li></ul>' },
      { h: 'How aiwillmake approaches it', body: '<p>aiwillmake is built around these safeguards. You describe someone in three answers or bring your messages; their AI twin writes the way they did, asks about what it doesn\'t know instead of inventing it, and remembers what you tell it. You can write them a letter or say goodbye. It is always clear that it is a reflection, not them.</p>' },
    ],
    cta: { text: 'Begin, gently →', href: '/app.html?import=1&mode=describe&ref=guide-explainer', note: 'Free to begin. Private to you. For adults 18+.' },
    faq: [
      { q: 'Is it healthy to talk to a dead loved one through AI?', a: 'It depends on the person and how it\'s used. Many find short, meaningful conversations — saying goodbye, telling them news — comforting. If it starts to replace connection with living people or makes grief heavier, step back and talk to someone you trust or a grief counselor.' },
      { q: 'Does the AI know things about them I didn\'t share?', a: 'No. It only knows what you provide. A well-designed service will ask about what it doesn\'t know rather than invent it.' },
    ],
  },
];
