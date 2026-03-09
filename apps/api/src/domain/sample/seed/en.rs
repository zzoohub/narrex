use chrono::Utc;
use uuid::Uuid;

use crate::domain::character::models::{
    Character, RelationshipDirection, RelationshipVisual,
};
use crate::domain::project::models::{PovType, Project, SourceType};
use crate::domain::timeline::models::{
    ConnectionType, SceneConnection, SceneStatus, Track,
};

use super::{SampleProjectData, SampleScene, build_relationships};

pub(super) fn build(user_id: Uuid) -> SampleProjectData {
    let now = Utc::now();

    // ── IDs ────────────────────────────────────────────────────────────
    let project_id = Uuid::new_v4();

    let track_clara = Uuid::new_v4();
    let track_agnes = Uuid::new_v4();

    let char_clara = Uuid::new_v4();
    let char_theo = Uuid::new_v4();
    let char_agnes = Uuid::new_v4();
    let char_lena = Uuid::new_v4();
    let char_hollow = Uuid::new_v4();

    let scene1 = Uuid::new_v4();
    let scene2 = Uuid::new_v4();
    let scene3 = Uuid::new_v4();
    let scene4 = Uuid::new_v4();
    let scene5 = Uuid::new_v4();
    let scene6 = Uuid::new_v4();
    let scene7 = Uuid::new_v4();
    let scene8 = Uuid::new_v4();
    let scene9 = Uuid::new_v4();

    // ── Project ────────────────────────────────────────────────────────
    let project = Project {
        id: project_id,
        user_id,
        title: "The Starbound Letters".into(),
        genre: Some("Cozy Fantasy Mystery".into()),
        theme: Some(
            "An ordinary woman inherits a bookshop and discovers that some books \
             contain real stories that can leak into the world. Someone has to \
             keep them contained, and that someone might be her."
                .into(),
        ),
        era_location: Some(
            "Thornhaven, a small coastal town in England, present day. Under the \
             town sits the Veil, a magical barrier between reality and the world \
             inside books. It's anchored to a bookshop called Whitmore Books and \
             maintained by a person known as the Keeper. When the Keeper dies, the \
             barrier starts to crack and stories begin leaking out."
                .into(),
        ),
        pov: Some(PovType::ThirdLimited),
        tone: Some(
            "Warm and cozy on the surface, with real stakes underneath. The magic \
             is book-based: words, stories, and pages have actual power."
                .into(),
        ),
        source_type: Some(SourceType::Sample),
        source_input: None,
        created_at: now,
        updated_at: now,
    };

    // ── Tracks ─────────────────────────────────────────────────────────
    let tracks = vec![
        Track {
            id: track_clara,
            project_id,
            position: 1.0,
            label: Some("Clara's Discovery".into()),
            created_at: now,
            updated_at: now,
        },
        Track {
            id: track_agnes,
            project_id,
            position: 2.0,
            label: Some("Agnes's Secret".into()),
            created_at: now,
            updated_at: now,
        },
    ];

    // ── Characters ─────────────────────────────────────────────────────
    let characters = vec![
        Character {
            id: char_clara,
            project_id,
            name: "Clara Whitmore".into(),
            personality: Some(
                "A burned-out London editor who inherits her great-aunt's bookshop. \
                 Practical, skeptical, quietly grieving a life that didn't go as \
                 planned. Reads constantly but has stopped believing in anything \
                 she can't explain."
                    .into(),
            ),
            appearance: Some(
                "Early 30s. Messy bun, reading glasses she keeps losing, oversized \
                 cardigans. Paint on her fingers from a college art habit she never \
                 dropped."
                    .into(),
            ),
            secrets: Some(
                "She didn't come to Thornhaven just for the inheritance. She was \
                 fired after a breakdown at work and hasn't told anyone here."
                    .into(),
            ),
            motivation: Some(
                "Start over somewhere simple. The plan was to sell the shop and move \
                 on, but Agnes's letters pull her into a mystery, and the town \
                 starts feeling like home."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(0.0),
            graph_y: Some(0.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_theo,
            project_id,
            name: "Theo Blackwell".into(),
            personality: Some(
                "The bookshop's most loyal customer. Charming, evasive, and way \
                 too well-read. Seems like a local history teacher, but knows \
                 things about the shop he shouldn't. He's actually a Veil Guardian \
                 — someone who patrols the barrier and contains breaches."
                    .into(),
            ),
            appearance: Some(
                "Late 30s. Dark curly hair, warm eyes, always a bit disheveled. \
                 Leather satchel full of notebooks. Faded scar on his left \
                 forearm from a past breach."
                    .into(),
            ),
            secrets: Some(
                "He was sent to Thornhaven because Agnes died. The Guardians knew \
                 her wards would weaken and someone had to watch the shop. He also \
                 knows the truth about Elena Graves — that Agnes chose the Veil \
                 over saving her."
                    .into(),
            ),
            motivation: Some(
                "Keep the Veil intact and protect Clara without telling her too \
                 much too soon. He's starting to think she might be exactly who \
                 the Guardians need, but he knows what that costs."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(200.0),
            graph_y: Some(-80.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_agnes,
            project_id,
            name: "Agnes Whitmore".into(),
            personality: Some(
                "Clara's late great-aunt. Only appears through her letters and the \
                 traces she left behind. Warm, sharp, deeply secretive. Spent fifty \
                 years guarding the Veil while pretending to be just an old \
                 bookseller."
                    .into(),
            ),
            appearance: Some(
                "Known from photos: silver hair in a crown braid, sharp blue eyes, \
                 always wearing an amber key-shaped brooch. The same one Clara \
                 finds in the hidden room."
                    .into(),
            ),
            secrets: Some(
                "She was the last Veil Keeper. The oath required giving up the \
                 ability to leave town — she took it at twenty-three and never left. \
                 Her deepest secret: when Elena Graves was pulled into a book, \
                 Agnes could have saved her by breaking the Veil. She chose not to."
                    .into(),
            ),
            motivation: Some(
                "Even after death, her letters guide Clara toward the truth while \
                 giving her the choice Agnes never had. Each letter is a quiet \
                 test: do you want this life, knowing what it costs?"
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(-200.0),
            graph_y: Some(0.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_lena,
            project_id,
            name: "Inspector Lena Graves".into(),
            personality: Some(
                "Thornhaven's only detective. Dry, methodical, stubbornly rational. \
                 She's been noticing strange things — books showing up where they \
                 shouldn't, tides that don't match any chart. She doesn't believe \
                 in magic, but the patterns don't add up."
                    .into(),
            ),
            appearance: Some(
                "Mid 40s. Short grey-streaked hair, weathered face, always in a \
                 navy peacoat. Carries a battered notebook from her first case."
                    .into(),
            ),
            secrets: Some(
                "Her mother Elena disappeared from Thornhaven thirty years ago. \
                 Elena was helping Agnes with 'book cataloguing' and vanished one \
                 night inside the bookshop. Every clue Lena has found points back \
                 to Whitmore Books."
                    .into(),
            ),
            motivation: Some(
                "Find out what happened to her mother. She's an ally to Clara, but \
                 also a risk — her investigation could blow the Veil wide open."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(200.0),
            graph_y: Some(80.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_hollow,
            project_id,
            name: "Mr. Hollow".into(),
            personality: Some(
                "A rare book collector who shows up right after Agnes dies. Polite, \
                 cultured, deeply unsettling. He's a Storied One — a character who \
                 escaped from a captured book into reality centuries ago. Without a \
                 special book called 'The Unwritten,' he'll eventually fade back \
                 into fiction."
                    .into(),
            ),
            appearance: Some(
                "Ageless — could be 40 or 60. Tall, thin, always in a dark suit \
                 and gloves. Unusual amber eyes that shift shade in different light. \
                 In certain mirrors, his reflection arrives a half-second late."
                    .into(),
            ),
            secrets: Some(
                "His escape from a book thirty years ago caused a tear in the Veil \
                 that pulled Elena Graves in. He didn't mean for it to happen, but \
                 he didn't try to fix it either. He needs 'The Unwritten' — a blank \
                 book that can rewrite a person's origin — to make himself real \
                 for good."
                    .into(),
            ),
            motivation: Some(
                "Get 'The Unwritten' from the bookshop's hidden vault. If he gets \
                 it, he becomes permanently real. If he doesn't, he fades away. \
                 Patient and charming, but getting desperate."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(-200.0),
            graph_y: Some(160.0),
            created_at: now,
            updated_at: now,
        },
    ];

    // ── Scenes ─────────────────────────────────────────────────────────
    let scenes = vec![
        // ── Track 1: Clara's Discovery ────────────────────────────────
        SampleScene {
            id: scene1,
            track_id: track_clara,
            project_id,
            start_position: 0.0,
            duration: 1.0,
            status: SceneStatus::Edited,
            title: "The Inheritance".into(),
            plot_summary: Some(
                "Clara arrives to settle Agnes's estate. The bookshop is dusty and \
                 chaotic. In the back office she finds an envelope in Agnes's \
                 handwriting: 'Read this when you're alone, by candlelight.' The \
                 first letter directs her to a specific shelf."
                    .into(),
            ),
            location: Some("Whitmore Books, Thornhaven High Street".into()),
            mood_tags: vec!["nostalgic".into(), "curious".into(), "bittersweet".into()],
            content: Some(SCENE1_CONTENT.into()),
            character_ids: vec![char_clara],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene2,
            track_id: track_clara,
            project_id,
            start_position: 1.0,
            duration: 1.0,
            status: SceneStatus::AiDraft,
            title: "The Hidden Room".into(),
            plot_summary: Some(
                "Agnes's letter leads Clara to a hidden room behind the biography \
                 shelf. Inside are books that shouldn't exist — pages that move, \
                 text that rearranges, one shelf warm to the touch. Theo shows up \
                 for his 'usual Tuesday browse' and barely hides his shock at \
                 finding the door open. He knew it was there."
                    .into(),
            ),
            location: Some("Whitmore Books, hidden back room".into()),
            mood_tags: vec!["wonder".into(), "suspense".into(), "discovery".into()],
            content: Some(SCENE2_CONTENT.into()),
            character_ids: vec![char_clara, char_theo],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene3,
            track_id: track_clara,
            project_id,
            start_position: 2.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "The Collector".into(),
            plot_summary: Some(
                "Mr. Hollow visits the shop for the first time. He browses like \
                 someone who's been here before and casually drops the name 'The \
                 Unwritten,' watching Clara for a reaction. She has none, but \
                 something about him feels off. After he leaves, his business card \
                 is blank — the text has vanished. That afternoon, Inspector Graves \
                 shows up asking about books missing from the library that match \
                 volumes in Agnes's hidden room."
                    .into(),
            ),
            location: Some("Whitmore Books, main floor".into()),
            mood_tags: vec!["unease".into(), "charm".into(), "suspicion".into()],
            content: None,
            character_ids: vec![char_clara, char_hollow, char_lena],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene4,
            track_id: track_clara,
            project_id,
            start_position: 3.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "Strange Tides".into(),
            plot_summary: Some(
                "Things start going wrong in Thornhaven. The tide comes in three \
                 hours early. A passage from a novel Clara shelved yesterday shows \
                 up handwritten on the harbour cafe's chalkboard. A customer says \
                 a book's ending changed since last week. Over tea, Theo admits \
                 Agnes was 'more than a bookseller' but won't explain. Graves has \
                 mapped the distortions — they all point back to the bookshop. \
                 Agnes's second letter warns: 'When the Keeper is gone, the \
                 stories leak.'"
                    .into(),
            ),
            location: Some("The Harbour Cafe + Whitmore Books".into()),
            mood_tags: vec!["eerie".into(), "escalation".into(), "dread".into()],
            content: None,
            character_ids: vec![char_clara, char_theo, char_lena],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene5,
            track_id: track_clara,
            project_id,
            start_position: 4.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "The Guardian's Truth".into(),
            plot_summary: Some(
                "Hollow comes back, less patient this time. He offers a huge sum for \
                 'The Unwritten.' Clara refuses — she doesn't even know what it is. \
                 His composure slips, the temperature drops, a book flips its own \
                 pages. Theo arrives and confronts Hollow directly. After Hollow \
                 leaves with a veiled threat, Theo tells Clara the truth: he's a \
                 Guardian, Agnes was the Keeper, and Hollow escaped from a book \
                 thirty years ago. Clara has to decide who to trust."
                    .into(),
            ),
            location: Some("Whitmore Books, late evening".into()),
            mood_tags: vec!["confrontation".into(), "revelation".into(), "choice".into()],
            content: None,
            character_ids: vec![char_clara, char_theo, char_hollow],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene6,
            track_id: track_clara,
            project_id,
            start_position: 5.0,
            duration: 1.5,
            status: SceneStatus::Empty,
            title: "Unbound".into(),
            plot_summary: Some(
                "The Veil tears open. Fictional characters appear on the streets, \
                 weather from stories seeps through cracks in reality. Hollow \
                 makes his final move for The Unwritten. Graves arrives with a \
                 photo from the library archives — her mother Elena standing in \
                 front of Whitmore Books the night she vanished, holding a book. \
                 It connects everything. Agnes's last letter reveals where The \
                 Unwritten is hidden and offers Clara the Keeper's oath. She must \
                 choose: bind herself to Thornhaven forever, or let the Veil fall."
                    .into(),
            ),
            location: Some("Whitmore Books — the Veil threshold".into()),
            mood_tags: vec!["climactic".into(), "magical".into(), "bittersweet".into()],
            content: None,
            character_ids: vec![char_clara, char_theo, char_hollow, char_lena],
            created_at: now,
            updated_at: now,
        },
        // ── Track 2: Agnes's Secret ───────────────────────────────────
        SampleScene {
            id: scene7,
            track_id: track_agnes,
            project_id,
            start_position: 1.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "The Night the Veil Sang".into(),
            plot_summary: Some(
                "1986. Agnes is twenty-three and takes shelter in the bookshop \
                 during a storm. In the back room, a book is reading itself aloud \
                 — pages turning on their own, words echoing off the walls. When \
                 she closes it, the storm stops instantly. In the corner, she sees \
                 a shadow shaped like a man, pressing against the air like it's \
                 testing the surface of water. The old Keeper, dying upstairs, \
                 calls down: 'You see it. That means you can hold it. Will you?'"
                    .into(),
            ),
            location: Some("Whitmore Books, 1986 — night of the storm".into()),
            mood_tags: vec!["awe".into(), "fear".into(), "calling".into()],
            content: None,
            character_ids: vec![char_agnes],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene8,
            track_id: track_agnes,
            project_id,
            start_position: 3.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "The One Who Got Out".into(),
            plot_summary: Some(
                "1994. A character has escaped from a captured book through a weak \
                 spot in the Veil. The escape tore a hole, and the hole is pulling \
                 things in. Elena Graves, who helps Agnes with the books, is in the \
                 shop when the tear widens. She gets pulled into the empty book the \
                 character left behind. Agnes can save her — but only by breaking \
                 the Veil, which would release every story into reality. She \
                 chooses the Veil. Elena is gone. Agnes seals the tear and tells \
                 no one."
                    .into(),
            ),
            location: Some("Whitmore Books, 1994 — the night Elena disappeared".into()),
            mood_tags: vec!["horror".into(), "sacrifice".into(), "guilt".into()],
            content: None,
            character_ids: vec![char_agnes, char_hollow],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene9,
            track_id: track_agnes,
            project_id,
            start_position: 4.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "The Last Ward".into(),
            plot_summary: Some(
                "2024. Agnes is seventy-one and failing. She writes her final \
                 letters by candlelight. She knows the Veil will weaken when she \
                 dies, and she knows Hollow is back — she saw him on the high \
                 street last week, looking exactly the same as thirty years ago. \
                 She can't fight him anymore. So she prepares: hides The Unwritten \
                 where only a real Keeper can find it, writes letters to guide \
                 Clara, and sets one last ward to buy enough time. Her final \
                 letter ends: 'I couldn't save Elena. I couldn't leave Thornhaven. \
                 But I can give you the truth, and that has to be enough.'"
                    .into(),
            ),
            location: Some("Whitmore Books, three weeks before Agnes's death".into()),
            mood_tags: vec!["farewell".into(), "urgency".into(), "love".into()],
            content: None,
            character_ids: vec![char_agnes],
            created_at: now,
            updated_at: now,
        },
    ];

    // ── Relationships ──────────────────────────────────────────────────
    let relationships = build_relationships(
        project_id,
        now,
        vec![
            (char_clara, char_theo, "Allies / growing trust", RelationshipVisual::Solid, RelationshipDirection::Bidirectional),
            (char_agnes, char_clara, "Great-aunt → Heir (via letters)", RelationshipVisual::Arrowed, RelationshipDirection::AToB),
            (char_clara, char_lena, "Uneasy cooperation", RelationshipVisual::Dashed, RelationshipDirection::Bidirectional),
            (char_theo, char_hollow, "Guardian vs. Storied One", RelationshipVisual::Arrowed, RelationshipDirection::AToB),
            (char_agnes, char_hollow, "Keeper vs. the one who escaped", RelationshipVisual::Dashed, RelationshipDirection::Bidirectional),
            (char_lena, char_agnes, "Connected by Elena's disappearance", RelationshipVisual::Dashed, RelationshipDirection::Bidirectional),
        ],
    );

    // ── Connections ────────────────────────────────────────────────────
    let connections = vec![
        // Branch: Guardian's Truth → The One Who Got Out
        // (Theo reveals Hollow's nature, connecting to his escape backstory)
        SceneConnection {
            id: Uuid::new_v4(),
            project_id,
            source_scene_id: scene5,
            target_scene_id: scene8,
            connection_type: ConnectionType::Branch,
            created_at: now,
        },
        // Merge: The Last Ward → Unbound
        // (Agnes's preparations lead directly to the climax)
        SceneConnection {
            id: Uuid::new_v4(),
            project_id,
            source_scene_id: scene9,
            target_scene_id: scene6,
            connection_type: ConnectionType::Merge,
            created_at: now,
        },
    ];

    SampleProjectData {
        project,
        tracks,
        characters,
        scenes,
        relationships,
        connections,
    }
}

// ── Scene content ──────────────────────────────────────────────────────

const SCENE1_CONTENT: &str = "\
The bell above the door hadn't rung in years. Clara could tell by the way it \
stuck mid-swing, making a sound less like a chime and more like a startled \
animal.

Whitmore Books looked exactly as she remembered from childhood visits — and \
exactly as she'd hoped it wouldn't. Shelves bowed under too many volumes. Dust \
floated in the amber light from the bay window. The whole place smelled of old \
paper and lavender, and it hit her so hard she had to grab the doorframe.

Agnes was everywhere and nowhere. Her reading glasses on the counter. A half-\
finished crossword by the register. A mug that said 'Plot Twist' with a tea \
stain still inside.

Clara set down her suitcase and picked up the envelope.

It was propped against the till, addressed in Agnes's looping handwriting: \
'For Clara — when you're alone, and by candlelight.'

She almost laughed. Even dead, Agnes had a flair for drama.

She found a candle in the desk drawer, lit it as the afternoon faded, and \
opened the letter.

'My dearest Clara,

If you're reading this, I've finally done the one thing I could never do in \
life — left Thornhaven. I'm sorry I couldn't explain while I was here. Some \
truths can only be written down, and some letters only work by candlelight.

The bookshop is yours now. But it's not just a bookshop.

Go to the biography section. Third shelf from the left. Find the copy of \
\"Amelia Earhart: The Final Flight.\" Pull it toward you, not out.

And Clara? Whatever you find — don't be afraid. Be curious.

All my love,
Agnes'";

const SCENE2_CONTENT: &str = "\
The Amelia Earhart biography didn't come off the shelf. It tilted forward like \
a lever, and something behind the wall clicked.

Clara stood still. The rational part of her brain — the part that had spent \
eight years editing nonfiction in London — said: secret rooms in bookshops \
aren't real. They belong in children's novels.

The wall swung open anyway.

The room behind it was small, maybe ten feet square, lit by a warm amber glow \
that seemed to come from the books themselves. About fifty volumes on the \
shelves, each bound in something she didn't recognize. Leather that shimmered. \
Cloth that was warm to the touch. One spine that appeared to be made of bark, \
still growing.

She reached for the nearest book — a slim one with no title — and opened it.

The pages were blank. Then they weren't.

Text appeared as she watched, forming like breath on cold glass: \
'She opened the book, and the book opened her.'

Clara dropped it. The text vanished.

'You found it, then.'

She spun. Theo Blackwell stood in the doorway, satchel over one shoulder, \
looking at the open wall with an expression she couldn't quite place. Not \
surprise — something closer to resignation.

'The hidden room,' he said. 'Agnes always said you'd find it eventually.'

'You knew about this?'

He hesitated a beat too long. 'I knew Agnes had her secrets.'

'That's not an answer.'

'No,' he agreed. 'It isn't.' He glanced at the shelves behind her, and just \
for a second, his composure cracked. 'Clara — did you touch any of the books \
on the top shelf?'

She hadn't. But the fact that he asked told her everything she needed to know: \
whatever was on that shelf was the real secret. And Theo Blackwell was not just \
a regular customer.";
