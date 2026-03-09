use chrono::Utc;
use uuid::Uuid;

use crate::domain::character::models::{
    Character, CharacterRelationship, RelationshipDirection, RelationshipVisual,
};
use crate::domain::project::models::{PovType, Project, SourceType};
use crate::domain::timeline::models::{
    ConnectionType, Scene, SceneConnection, SceneStatus, Track,
};

/// All entities for a sample project, ready for atomic insertion.
pub struct SampleProjectData {
    pub project: Project,
    pub tracks: Vec<Track>,
    pub characters: Vec<Character>,
    pub scenes: Vec<Scene>,
    pub relationships: Vec<CharacterRelationship>,
    pub connections: Vec<SceneConnection>,
}

/// Build a complete sample project for a newly signed-up user.
///
/// Every call generates fresh UUIDs so each user gets independent rows.
/// The story is a Korean regression-fantasy (회귀 판타지) chosen because:
/// - Most popular genre among the target audience
/// - Naturally demonstrates multi-track timelines (protagonist vs antagonist)
/// - Rich character relationships
pub fn build_sample_project(user_id: Uuid) -> SampleProjectData {
    let now = Utc::now();

    // ── IDs ────────────────────────────────────────────────────────────
    let project_id = Uuid::new_v4();

    let track_hero = Uuid::new_v4();
    let track_shadow = Uuid::new_v4();

    let char_kan = Uuid::new_v4();
    let char_serian = Uuid::new_v4();
    let char_moren = Uuid::new_v4();
    let char_irene = Uuid::new_v4();
    let char_kaijel = Uuid::new_v4();

    let scene1 = Uuid::new_v4();
    let scene2 = Uuid::new_v4();
    let scene3 = Uuid::new_v4();
    let scene4 = Uuid::new_v4();
    let scene5 = Uuid::new_v4();
    let scene6 = Uuid::new_v4(); // merge point
    let scene7 = Uuid::new_v4();
    let scene8 = Uuid::new_v4();
    let scene9 = Uuid::new_v4();

    // ── Project ────────────────────────────────────────────────────────
    let project = Project {
        id: project_id,
        user_id,
        title: "회귀 기사의 두 번째 인생".into(),
        genre: Some("회귀 판타지".into()),
        theme: Some("운명에 맞서는 두 번째 기회 — 미래의 기억을 가진 자의 선택과 대가".into()),
        era_location: Some(
            "알케니아 대륙 — 중세 판타지 세계. 왕국 아스테론의 변방 영지에서 시작".into(),
        ),
        pov: Some(PovType::ThirdLimited),
        tone: Some(
            "절제된 성장 서사. 과거의 트라우마를 품은 채 냉정하게 미래를 준비하는 분위기".into(),
        ),
        source_type: Some(SourceType::Sample),
        source_input: None,
        created_at: now,
        updated_at: now,
    };

    // ── Tracks ─────────────────────────────────────────────────────────
    let tracks = vec![
        Track {
            id: track_hero,
            project_id,
            position: 1.0,
            label: Some("칸의 여정".into()),
            created_at: now,
            updated_at: now,
        },
        Track {
            id: track_shadow,
            project_id,
            position: 2.0,
            label: Some("그림자의 움직임".into()),
            created_at: now,
            updated_at: now,
        },
    ];

    // ── Characters ─────────────────────────────────────────────────────
    let characters = vec![
        Character {
            id: char_kan,
            project_id,
            name: "칸 아르테시아".into(),
            personality: Some(
                "전생에서 제국 최강의 기사였으나, 동료들의 배신으로 죽었다. \
                 회귀 후 냉정하고 계산적으로 변했지만, 소중한 사람들 앞에서는 \
                 여전히 따뜻하다. 감정을 드러내는 것을 약점이라 여기면서도 \
                 완전히 감추지는 못한다. 뛰어난 전략적 사고와 30년치 전장 경험이 \
                 12세 소년의 몸에 갇혀 있다."
                    .into(),
            ),
            appearance: Some(
                "은백색 단발. 왼손 검지에 전생의 마지막 전투에서 얻은 흉터 — \
                 회귀 후에도 남아있는 유일한 증거. 평범한 체격의 12세 소년이지만, \
                 눈빛만은 나이에 맞지 않게 깊다."
                    .into(),
            ),
            secrets: Some(
                "회귀자라는 사실 자체가 최대의 비밀. 전생에서 흑요석 탑의 멸망 \
                 의식을 직접 목격했으며, 이를 막을 유일한 열쇠가 '성검 에클리아'\
                 라는 것을 안다. 또한 전생에서 자신을 배신한 '그림자 서약'의 핵심 \
                 인물이 어린 시절 친구 세리안이라는 것을 기억한다."
                    .into(),
            ),
            motivation: Some(
                "전생에서 지키지 못한 사람들을 이번에는 반드시 지킨다. 특히 스승 \
                 모렌과 여동생의 죽음을 막는 것이 최우선. 동시에 흑요석 탑의 멸망을 \
                 막아야 대륙 전체가 살아남는다."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(0.0),
            graph_y: Some(0.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_serian,
            project_id,
            name: "세리안 로크하트".into(),
            personality: Some(
                "밝고 사교적이며 누구에게나 호감을 주는 성격. 하지만 내면에는 \
                 평민 출신이라는 열등감과 인정받고자 하는 강렬한 욕구가 있다. \
                 현재는 순수한 소년이지만, 전생에서는 이 열등감이 '그림자 서약'에 \
                 합류하는 동기가 되었다."
                    .into(),
            ),
            appearance: Some(
                "갈색 곱슬머리, 주근깨가 있는 밝은 얼굴. 칸보다 키가 약간 크고 \
                 건장하다. 항상 웃고 있어서 표정을 읽기 어렵다."
                    .into(),
            ),
            secrets: Some(
                "현재 시점에서 본인의 비밀은 없다. 다만 칸은 이 소년이 미래에 자신을 \
                 배신할 인물이라는 것을 알고 있다."
                    .into(),
            ),
            motivation: Some(
                "검술 대회에서 우승하여 기사단에 입단하는 것. 평민이 귀족 기사단에 \
                 들어가는 유일한 길. 칸의 곁에 있으면 자신도 더 강해질 수 있다고 믿는다."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(200.0),
            graph_y: Some(-80.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_moren,
            project_id,
            name: "모렌 그레이울프".into(),
            personality: Some(
                "과묵하고 엄격하지만, 행동으로 제자를 보호하는 사람. 말보다 한 수 먼저 \
                 움직이는 타입. 왕국에서 은퇴한 기사로, 변방에서 조용히 살고 있다. \
                 전생에서 칸이 가장 존경했던 사람이며, 흑요석 탑의 첫 번째 습격에서 \
                 칸을 감싸고 죽었다."
                    .into(),
            ),
            appearance: Some(
                "흰 머리와 깊은 주름이 있지만 체격은 여전히 단단하다. 오른쪽 어깨에 \
                 옛 전투의 화상 흉터. 항상 낡은 회색 외투를 입고 있다."
                    .into(),
            ),
            secrets: Some(
                "과거 왕국 기사단 '은빛 맹세단'의 부단장이었으나, 왕의 비윤리적 명령을 \
                 거부하고 추방되었다. 변방에 숨어 사는 진짜 이유는 왕국이 아직 그를 \
                 위험인물로 감시하고 있기 때문."
                    .into(),
            ),
            motivation: Some(
                "조용히 여생을 보내는 것. 하지만 칸이라는 비범한 제자를 만나면서 잠들어 \
                 있던 기사로서의 사명감이 다시 깨어나기 시작한다."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(-200.0),
            graph_y: Some(0.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_irene,
            project_id,
            name: "아이린 벨라토르".into(),
            personality: Some(
                "자존심 강하고 직선적. 감정을 숨기지 않고 표현하며, 불의를 보면 참지 \
                 못한다. 귀족 가문의 딸이지만 형식적인 예절보다 실력을 중시한다. \
                 전생에서 칸과 함께 최후의 전투를 치른 동료 중 한 명이었다."
                    .into(),
            ),
            appearance: Some(
                "검은 장발을 높이 묶고 다닌다. 날카로운 인상이지만 웃을 때는 의외로 \
                 부드럽다. 12세임에도 검을 들면 자세가 완벽하다."
                    .into(),
            ),
            secrets: Some(
                "벨라토르 가문이 몰래 '그림자 서약'에 자금을 대고 있다는 것을 아직 \
                 모른다. 전생에서 이 사실을 알게 된 후 가문과 결별했다."
                    .into(),
            ),
            motivation: Some(
                "아버지가 인정하는 기사가 되는 것. 동시에 '진짜 강한 사람'이 무엇인지 \
                 알고 싶다 — 칸에게서 자신과는 다른 종류의 강함을 느낀다."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(200.0),
            graph_y: Some(80.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_kaijel,
            project_id,
            name: "카이젤".into(),
            personality: Some(
                "차갑고 합리적. 감정이 아닌 논리로 움직인다. 스스로를 '세계를 정화하는 \
                 자'라 칭하며, 흑요석 탑의 힘으로 부패한 왕국을 멸망시키고 새 질서를 \
                 세우려 한다. 잔인하지만 목적 없는 폭력은 경멸한다."
                    .into(),
            ),
            appearance: Some(
                "항상 검은 후드 아래 얼굴을 가린다. 드물게 보이는 눈은 한쪽이 금색, \
                 한쪽이 검은색의 오드아이. 키가 크고 마른 체형."
                    .into(),
            ),
            secrets: Some(
                "원래 왕국의 귀족이었으며, 왕에 의해 가문이 멸문당했다. 흑요석 탑의 \
                 고대 의식이 실제로 대륙 전체를 멸망시킨다는 것을 알고 있지만, 이를 \
                 '필요한 정화'라고 합리화한다."
                    .into(),
            ),
            motivation: Some(
                "왕국의 멸망. 흑요석 탑의 의식을 완성하여 '부패한 질서'를 끝내고 \
                 새로운 세계를 여는 것. 이를 위해 전 대륙에 '그림자 서약' 조직을 \
                 심어놓았다."
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
    // Track 1: 칸의 여정 (6 scenes)
    // Track 2: 그림자의 움직임 (3 scenes)

    let scenes = vec![
        // ── Track 1 ────────────────────────────────────────────────────
        Scene {
            id: scene1,
            track_id: track_hero,
            project_id,
            start_position: 0.0,
            duration: 1.0,
            status: SceneStatus::Edited,
            title: "회귀의 순간".into(),
            plot_summary: Some(
                "전투에서 동료의 배신으로 죽은 기사 칸이 12세의 몸으로 눈을 뜬다. \
                 초반의 혼란과 불신 — 꿈인지 현실인지 구분이 안 된다. 왼손의 흉터를 \
                 발견하고 회귀가 실제임을 확인. 창밖으로 살아있는 영지의 풍경을 보며 \
                 결심한다: '이번에는 지킨다.'"
                    .into(),
            ),
            location: Some("아르테시아 영지, 칸의 방".into()),
            mood_tags: vec!["긴장".into(), "경이".into(), "결의".into()],
            content: Some(SCENE1_CONTENT.into()),
            character_ids: vec![char_kan],
            created_at: now,
            updated_at: now,
        },
        Scene {
            id: scene2,
            track_id: track_hero,
            project_id,
            start_position: 1024.0,
            duration: 1.0,
            status: SceneStatus::AiDraft,
            title: "낡은 검과 새로운 선택".into(),
            plot_summary: Some(
                "칸이 전생의 감각을 확인하기 위해 새벽에 몰래 훈련장에 나간다. 12세의 \
                 체력으로는 전생의 검술을 재현할 수 없다는 현실과 마주한다. 이때 어린 \
                 시절 친구 세리안이 나타나 함께 훈련하자고 한다. 칸은 세리안의 해맑은 \
                 얼굴을 보며 복잡한 감정을 느낀다 — 이 소년이 미래에 자신을 배신할 \
                 것을 알기에."
                    .into(),
            ),
            location: Some("영지 외곽 훈련장".into()),
            mood_tags: vec!["쓸쓸함".into(), "갈등".into(), "결단".into()],
            content: Some(SCENE2_CONTENT.into()),
            character_ids: vec![char_kan, char_serian],
            created_at: now,
            updated_at: now,
        },
        Scene {
            id: scene3,
            track_id: track_hero,
            project_id,
            start_position: 2048.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "스승과의 재회".into(),
            plot_summary: Some(
                "칸이 전생의 기억을 따라 은퇴한 기사 모렌을 찾아간다. 모렌은 제자를 \
                 받지 않겠다며 거절. 칸이 모렌만 아는 '은빛 맹세단의 세 번째 맹세' \
                 내용을 말하자 모렌이 경계한다. 칸은 회귀 사실을 숨긴 채 '꿈에서 \
                 보았다'고 둘러댄다. 모렌은 의심하면서도 칸의 눈빛에서 무언가를 느끼고, \
                 조건부로 가르침을 허락한다."
                    .into(),
            ),
            location: Some("영지 북쪽 숲 속 오두막".into()),
            mood_tags: vec!["긴장".into(), "그리움".into(), "설득".into()],
            content: None,
            character_ids: vec![char_kan, char_moren],
            created_at: now,
            updated_at: now,
        },
        Scene {
            id: scene4,
            track_id: track_hero,
            project_id,
            start_position: 3072.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "숨겨진 보물".into(),
            plot_summary: Some(
                "칸이 미래의 기억을 이용해 영지 폐광 깊은 곳에 숨겨진 '서리불꽃 검'을 \
                 찾으러 간다. 전생에서 이 검은 10년 후 다른 기사가 발견하여 왕국의 영웅이 \
                 되었지만, 칸은 그보다 먼저 손에 넣어야 한다. 폐광에는 예상치 못한 마수가 \
                 깨어나 있고, 12세의 칸은 전생의 전술 지식만으로 생존해야 한다. 간신히 \
                 검을 획득하지만, 마수와의 전투에서 팔에 부상을 입는다."
                    .into(),
            ),
            location: Some("영지 지하 폐광".into()),
            mood_tags: vec!["모험".into(), "긴장".into(), "위험".into()],
            content: None,
            character_ids: vec![char_kan],
            created_at: now,
            updated_at: now,
        },
        Scene {
            id: scene5,
            track_id: track_hero,
            project_id,
            start_position: 4096.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "동맹의 조각들".into(),
            plot_summary: Some(
                "칸이 아이린을 전생보다 일찍 만나기 위해 기사 후보생 선발 대회에 참가한다. \
                 세리안도 함께 참가. 대회에서 칸은 의도적으로 실력을 숨기고 전략으로 \
                 승리하며, 아이린은 순수한 검술 실력으로 압도적인 성적을 낸다. 결승에서 \
                 칸과 아이린이 대결 — 칸이 아이린의 검술 스타일을 '이미 아는' 듯 \
                 막아내자 아이린이 의문을 품는다. 대회 후 세리안은 한 귀족에게 접근받는 \
                 장면이 스쳐 지나간다."
                    .into(),
            ),
            location: Some("아스테론 왕도 외곽, 기사 후보생 선발 대회장".into()),
            mood_tags: vec!["열기".into(), "경쟁".into(), "복선".into()],
            content: None,
            character_ids: vec![char_kan, char_irene, char_serian],
            created_at: now,
            updated_at: now,
        },
        // Scene 6 is the merge point (at end of track 1)
        Scene {
            id: scene6,
            track_id: track_hero,
            project_id,
            start_position: 5120.0,
            duration: 1.5,
            status: SceneStatus::Empty,
            title: "첫 번째 대결".into(),
            plot_summary: Some(
                "그림자 서약이 고대 신전에서 의식의 첫 단계를 실행하려 한다. 칸은 이 \
                 시점을 기억하고 사전에 모렌, 아이린과 함께 저지하러 간다. 카이젤이 직접 \
                 현장에 나타나 모렌과 재회한다 — 과거 동료였던 두 사람의 대치. 칸은 \
                 카이젤의 실력이 12세 자신의 한계를 훨씬 넘는다는 것을 실감. 의식은 \
                 부분적으로 저지하지만, 카이젤은 여유롭게 철수하며 '다음에는 더 \
                 흥미롭겠군'이라고 남긴다."
                    .into(),
            ),
            location: Some("변방 영지 외곽, 폐허가 된 고대 신전".into()),
            mood_tags: vec!["긴박".into(), "충격".into(), "위기감".into()],
            content: None,
            character_ids: vec![char_kan, char_moren, char_irene, char_kaijel],
            created_at: now,
            updated_at: now,
        },
        // ── Track 2 ────────────────────────────────────────────────────
        Scene {
            id: scene7,
            track_id: track_shadow,
            project_id,
            start_position: 1024.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "그림자의 움직임".into(),
            plot_summary: Some(
                "카이젤이 '그림자 서약'의 간부들과 회의한다. 흑요석 탑의 의식을 위한 \
                 세 가지 봉인석의 위치가 확인되었으며, 첫 번째 봉인석은 변방 영지 근처의 \
                 고대 신전에 있다. 카이젤은 '변방부터 시작한다'고 지시하며, 동시에 기사 \
                 후보생 대회에 정보원을 심을 것을 명령한다. 장면 마지막에 카이젤이 혼자 \
                 중얼거린다: '은빛 맹세단의 잔재... 그레이울프가 거기 있었군.'"
                    .into(),
            ),
            location: Some("알 수 없는 지하 거처".into()),
            mood_tags: vec!["음모".into(), "위협".into(), "암흑".into()],
            content: None,
            character_ids: vec![char_kaijel],
            created_at: now,
            updated_at: now,
        },
        Scene {
            id: scene8,
            track_id: track_shadow,
            project_id,
            start_position: 3072.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "첩자의 씨앗".into(),
            plot_summary: Some(
                "기사 후보생 대회 직후. 대회에서 탈락한 평민 후보생들의 불만을 이용해, \
                 그림자 서약의 하급 공작원이 세리안에게 접근한다. '실력이 있어도 평민은 \
                 결국 기사가 될 수 없다'라는 말에 세리안의 열등감이 자극된다. 직접적인 \
                 포섭은 아니지만, '다른 길이 있다'는 암시를 남긴다. 세리안은 거절하지만, \
                 씨앗은 이미 뿌려졌다. 카이젤은 보고를 받으며 '서두르지 마라. 그 아이는 \
                 시간이 해결할 것이다'라고 말한다."
                    .into(),
            ),
            location: Some("왕도 뒷골목".into()),
            mood_tags: vec!["불안".into(), "유혹".into(), "복선".into()],
            content: None,
            character_ids: vec![char_kaijel, char_serian],
            created_at: now,
            updated_at: now,
        },
        Scene {
            id: scene9,
            track_id: track_shadow,
            project_id,
            start_position: 4096.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "봉인석 탈취".into(),
            plot_summary: Some(
                "카이젤이 직접 고대 신전에 진입하여 첫 번째 봉인석을 확보하려 한다. \
                 신전의 고대 수호 장치를 무력화하는 과정에서 카이젤의 전투 실력이 \
                 묘사된다 — 마법과 검술을 동시에 구사하는 압도적인 실력. 의식의 \
                 첫 단계가 시작되나, 칸 일행이 도착하며 '첫 번째 대결' 씬으로 \
                 이어진다."
                    .into(),
            ),
            location: Some("변방 고대 신전".into()),
            mood_tags: vec!["위압".into(), "어둠".into(), "준비".into()],
            content: None,
            character_ids: vec![char_kaijel],
            created_at: now,
            updated_at: now,
        },
    ];

    // ── Relationships ──────────────────────────────────────────────────
    // DB constraint: character_a_id < character_b_id (UUID ordering).
    let relationships = build_relationships(
        project_id,
        now,
        char_kan,
        char_serian,
        char_moren,
        char_irene,
        char_kaijel,
    );

    // ── Connections (branch / merge) ───────────────────────────────────
    let connections = vec![
        // Branch: 동맹의 조각들 → 첩자의 씨앗
        // (The same tournament event triggers both alliance-building and Shadow Covenant's recruitment)
        SceneConnection {
            id: Uuid::new_v4(),
            project_id,
            source_scene_id: scene5,
            target_scene_id: scene8,
            connection_type: ConnectionType::Branch,
            created_at: now,
        },
        // Merge: 봉인석 탈취 → 첫 번째 대결
        // (Both tracks converge at the confrontation)
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

/// Build relationships with correct UUID ordering (a_id < b_id).
fn build_relationships(
    project_id: Uuid,
    now: chrono::DateTime<Utc>,
    kan: Uuid,
    serian: Uuid,
    moren: Uuid,
    irene: Uuid,
    kaijel: Uuid,
) -> Vec<CharacterRelationship> {
    let defs: Vec<(Uuid, Uuid, &str, RelationshipVisual, RelationshipDirection)> = vec![
        // 칸 ↔ 세리안: 어린 시절 친구
        (kan, serian, "어린 시절 친구", RelationshipVisual::Solid, RelationshipDirection::Bidirectional),
        // 모렌 → 칸: 사제 (모렌이 스승, 칸이 제자)
        (moren, kan, "사제 (스승과 제자)", RelationshipVisual::Arrowed, RelationshipDirection::AToB),
        // 칸 ↔ 아이린: 라이벌
        (kan, irene, "라이벌 / 전우", RelationshipVisual::Dashed, RelationshipDirection::Bidirectional),
        // 세리안 → 카이젤: 미래의 충성
        (serian, kaijel, "미래의 충성", RelationshipVisual::Dashed, RelationshipDirection::AToB),
        // 모렌 ↔ 카이젤: 과거의 인연
        (moren, kaijel, "과거의 인연", RelationshipVisual::Dashed, RelationshipDirection::Bidirectional),
        // 아이린 ↔ 세리안: 기사단 동기
        (irene, serian, "기사단 동기", RelationshipVisual::Solid, RelationshipDirection::Bidirectional),
    ];

    defs.into_iter()
        .map(|(a, b, label, visual, dir)| {
            let (ordered_a, ordered_b, ordered_dir) = if a < b {
                (a, b, dir)
            } else {
                let flipped = match dir {
                    RelationshipDirection::AToB => RelationshipDirection::BToA,
                    RelationshipDirection::BToA => RelationshipDirection::AToB,
                    d => d,
                };
                (b, a, flipped)
            };
            CharacterRelationship {
                id: Uuid::new_v4(),
                project_id,
                character_a_id: ordered_a,
                character_b_id: ordered_b,
                label: label.into(),
                visual_type: visual,
                direction: ordered_dir,
                created_at: now,
                updated_at: now,
            }
        })
        .collect()
}

// ── Scene content ──────────────────────────────────────────────────────
// Minimal but quality prose to demonstrate the editor with real content.

const SCENE1_CONTENT: &str = "\
어둠 속에서 칸은 눈을 떴다.

천장이 보였다. 낡은 나무 서까래 사이로 새벽빛이 스며들고 있었다. 익숙한 천장이었다. \
너무나 익숙해서, 오히려 낯설었다.

이 천장을 마지막으로 본 것은 스무 해 전이었다.

칸은 숨을 멈추었다. 온몸의 감각이 돌아왔다 — 싸늘한 아침 공기, 거친 린넨 이불의 \
감촉, 멀리서 들려오는 닭 울음소리. 하나하나가 기억과 정확히 일치했다. 단 하나, \
몸이 달랐다. 작았다. 터무니없이 작았다.

왼손을 들어올렸다. 검지에 흉터가 있었다. 전생의 마지막 전투에서, 배신자의 칼날이 \
검을 든 손을 스쳐 지나갔을 때 생긴 것이다. 그 흉터가 여기, 열두 살의 손가락 위에 \
남아 있었다.

꿈이 아니었다.

칸은 천천히 몸을 일으켜 창가로 걸어갔다. 창밖으로 아르테시아 영지의 아침이 \
펼쳐져 있었다. 연기를 피워 올리는 굴뚝들, 우물가에 모인 하인들, 마구간에서 \
말에게 여물을 주는 마부. 전쟁으로 불타 사라진 풍경이 눈앞에 온전히 살아 있었다.

목이 조였다. 눈시울이 뜨거워졌지만, 칸은 울지 않았다. 서른 해의 전장이 \
감정을 다스리는 법을 가르쳐주었으니까.

대신, 주먹을 쥐었다.

'이번에는 지킨다.'";

const SCENE2_CONTENT: &str = "\
새벽 안개가 훈련장을 덮고 있었다.

칸은 장작 더미 뒤에 세워둔 낡은 목검을 집어 들었다. 전생에서 수천 번 반복했던 \
기본 자세를 취하려 했지만, 몸이 따라주지 않았다. 어깨가 너무 좁고, 팔이 너무 \
짧고, 손아귀에 힘이 없었다.

열두 살의 근육은 서른 해의 기억을 담기엔 터무니없이 부족했다.

'삼류 기사의 검식도 못 쓰겠군.'

칸은 쓴웃음을 지으며 목검을 내렸다. 머리로는 모든 것을 알고 있었다. 검의 \
궤적, 발의 위치, 체중 이동의 타이밍. 하지만 몸은 백지였다. 처음부터 다시 \
쌓아야 했다.

\"칸? 너 이 시간에 여기서 뭐 해?\"

익숙한 목소리에 칸의 손이 멈추었다. 돌아보지 않아도 알 수 있었다. 갈색 \
곱슬머리, 주근깨 가득한 밝은 얼굴. 해맑게 웃고 있을 세리안 로크하트.

\"...훈련.\"

\"이 새벽에? 대단한데! 나도 끼워줘.\"

세리안이 거리낌 없이 옆에 서서 목검을 집어 들었다. 거짓 없는 눈이 칸을 \
바라보고 있었다.

칸은 그 눈을 마주하며 생각했다. 전생에서 이 소년은 그림자 서약에 합류했고, \
최후의 전투에서 칸의 등에 칼을 꽂았다. 지금 이 해맑은 웃음 뒤에 그 미래가 \
숨어 있다는 것을 칸만이 알고 있었다.

'아직은 아니다. 이 녀석은 아직 바뀌지 않았다.'

\"...그래. 기본 자세부터 하자.\"

칸은 목검을 다시 들어올렸다. 옆에 선 세리안의 웃음소리가 새벽 안개 속으로 \
퍼져나갔다.";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seed_data_counts() {
        let data = build_sample_project(Uuid::new_v4());
        assert_eq!(data.tracks.len(), 2, "2 tracks");
        assert_eq!(data.scenes.len(), 9, "9 scenes");
        assert_eq!(data.characters.len(), 5, "5 characters");
        assert_eq!(data.relationships.len(), 6, "6 relationships");
        assert_eq!(data.connections.len(), 2, "2 connections (1 branch + 1 merge)");
    }

    #[test]
    fn seed_project_is_sample_type() {
        let data = build_sample_project(Uuid::new_v4());
        assert_eq!(data.project.source_type, Some(SourceType::Sample));
    }

    #[test]
    fn seed_scenes_have_correct_statuses() {
        let data = build_sample_project(Uuid::new_v4());
        let edited = data.scenes.iter().filter(|s| s.status == SceneStatus::Edited).count();
        let ai_draft = data.scenes.iter().filter(|s| s.status == SceneStatus::AiDraft).count();
        let empty = data.scenes.iter().filter(|s| s.status == SceneStatus::Empty).count();
        assert_eq!(edited, 1, "1 edited scene");
        assert_eq!(ai_draft, 1, "1 ai_draft scene");
        assert_eq!(empty, 7, "7 empty scenes");
    }

    #[test]
    fn seed_scenes_with_content_have_text() {
        let data = build_sample_project(Uuid::new_v4());
        for scene in &data.scenes {
            match scene.status {
                SceneStatus::Edited | SceneStatus::AiDraft => {
                    assert!(scene.content.is_some(), "scene '{}' should have content", scene.title);
                    assert!(!scene.content.as_ref().unwrap().is_empty());
                }
                _ => {
                    assert!(scene.content.is_none(), "scene '{}' should have no content", scene.title);
                }
            }
        }
    }

    #[test]
    fn seed_relationships_obey_uuid_ordering() {
        let data = build_sample_project(Uuid::new_v4());
        for rel in &data.relationships {
            assert!(
                rel.character_a_id < rel.character_b_id,
                "relationship '{}': a_id must be < b_id",
                rel.label
            );
        }
    }

    #[test]
    fn seed_connections_have_both_types() {
        let data = build_sample_project(Uuid::new_v4());
        let has_branch = data.connections.iter().any(|c| c.connection_type == ConnectionType::Branch);
        let has_merge = data.connections.iter().any(|c| c.connection_type == ConnectionType::Merge);
        assert!(has_branch, "should have a branch connection");
        assert!(has_merge, "should have a merge connection");
    }

    #[test]
    fn seed_each_scene_has_at_least_one_character() {
        let data = build_sample_project(Uuid::new_v4());
        for scene in &data.scenes {
            assert!(
                !scene.character_ids.is_empty(),
                "scene '{}' should have at least one character",
                scene.title
            );
        }
    }

    #[test]
    fn seed_character_ids_reference_valid_characters() {
        let data = build_sample_project(Uuid::new_v4());
        let char_ids: std::collections::HashSet<Uuid> =
            data.characters.iter().map(|c| c.id).collect();
        for scene in &data.scenes {
            for cid in &scene.character_ids {
                assert!(
                    char_ids.contains(cid),
                    "scene '{}' references unknown character {}",
                    scene.title,
                    cid
                );
            }
        }
    }

    #[test]
    fn seed_fresh_uuids_per_call() {
        let d1 = build_sample_project(Uuid::new_v4());
        let d2 = build_sample_project(Uuid::new_v4());
        assert_ne!(d1.project.id, d2.project.id, "each call should produce unique project IDs");
    }

    #[test]
    fn seed_all_scenes_belong_to_project() {
        let data = build_sample_project(Uuid::new_v4());
        for scene in &data.scenes {
            assert_eq!(scene.project_id, data.project.id);
        }
    }

    #[test]
    fn seed_all_characters_belong_to_project() {
        let data = build_sample_project(Uuid::new_v4());
        for ch in &data.characters {
            assert_eq!(ch.project_id, data.project.id);
        }
    }
}
