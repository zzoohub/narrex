use chrono::Utc;
use uuid::Uuid;

use crate::domain::character::models::{Character, RelationshipDirection, RelationshipVisual};
use crate::domain::project::models::{PovType, Project, SourceType};
use crate::domain::timeline::models::{ConnectionType, SceneConnection, SceneStatus, Track};

use super::{build_relationships, SampleProjectData, SampleScene};

pub(super) fn build(user_id: Uuid) -> SampleProjectData {
    let now = Utc::now();

    // ── IDs ────────────────────────────────────────────────────────────
    let project_id = Uuid::new_v4();

    let track_present = Uuid::new_v4();
    let track_past = Uuid::new_v4();

    let char_hayoon = Uuid::new_v4();
    let char_doyoon = Uuid::new_v4();
    let char_youngsuk = Uuid::new_v4();
    let char_chaerin = Uuid::new_v4();
    let char_junseo = Uuid::new_v4();

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
        title: "다시, 그 계절".into(),
        genre: Some("현대 로맨스".into()),
        theme: Some(
            "말하지 못한 마음은 사라지는 게 아니라 기다리고 있었다는 것. \
             돌아온 고향에서 다시 마주친 첫사랑, 그리고 7년 전 여름에 \
             전하지 못한 편지 한 통."
                .into(),
        ),
        era_location: Some(
            "해운리 — 남해안의 작은 해안 마을, 현대. 절벽 아래 작은 항구와 \
             좁은 골목, 방파제 너머로 보이는 수평선. 마을 중심에 40년 된 \
             '파도서점'이 있고, 항구 옆에 카페 '만조'가 있다. 여름이면 \
             축제가 열리고, 겨울이면 파도 소리만 남는 곳."
                .into(),
        ),
        pov: Some(PovType::ThirdLimited),
        tone: Some(
            "따뜻하고 잔잔한 문체. 감정을 직접 설명하기보다 행동과 풍경으로 \
             보여준다. 유머는 대화 속에 자연스럽게. 과거 회상은 현재보다 \
             색감이 선명하고 감각적이다."
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
            id: track_present,
            project_id,
            position: 1.0,
            label: Some("현재 — 하윤의 귀향".into()),
            created_at: now,
            updated_at: now,
        },
        Track {
            id: track_past,
            project_id,
            position: 2.0,
            label: Some("7년 전 — 그해 여름".into()),
            created_at: now,
            updated_at: now,
        },
    ];

    // ── Characters ─────────────────────────────────────────────────────
    let characters = vec![
        Character {
            id: char_hayoon,
            project_id,
            name: "서하윤".into(),
            personality: Some(
                "서른 살. 서울 출판사에서 5년간 일하다 번아웃으로 퇴사한 편집자. \
                 외할머니 영숙이 남긴 '파도서점'을 정리하기 위해 7년 만에 해운리로 \
                 돌아온다. 책임감 강하고 꼼꼼하지만, 자기 감정에는 서툴다. 서울에서 \
                 무너진 뒤로 '괜찮다'는 말이 습관이 되었다. 고향을 떠난 진짜 이유는 \
                 도윤 때문이었다는 걸 아직도 인정하지 않는다."
                    .into(),
            ),
            appearance: Some(
                "단발머리에 얇은 뿔테 안경. 늘 린넨 셔츠에 넓은 바지를 입는다. \
                 손톱이 짧고, 손가락 마디에 펜 잡던 굳은살이 있다. 웃을 때 \
                 왼쪽 볼에만 보조개가 생긴다."
                    .into(),
            ),
            secrets: Some(
                "서울을 떠난 건 번아웃만이 아니다 — 믿었던 선배 편집자에게 기획을 \
                 빼앗기고, 항의하다 팀에서 밀려났다. 해운리의 누구에게도 말하지 않았다."
                    .into(),
            ),
            motivation: Some(
                "서점을 정리하고 다시 서울로 돌아갈 계획이었다. 하지만 할머니의 편지, \
                 잊으려 했던 사람, 변하지 않은 마을이 발목을 잡는다. 진짜 원하는 삶이 \
                 어디에 있는지 처음으로 스스로에게 묻기 시작한다."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(0.0),
            graph_y: Some(0.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_doyoon,
            project_id,
            name: "강도윤".into(),
            personality: Some(
                "서른한 살. 서울의 대형 건축사무소에서 일하다 3년 전 해운리로 돌아온 \
                 건축가. 현재 마을의 오래된 건물을 리모델링하는 일을 한다. 과묵하고 \
                 성실하며, 말보다 행동이 앞서는 사람. 감정을 잘 드러내지 않지만, \
                 가끔 빈틈이 보인다 — 주로 하윤과 관련된 순간에."
                    .into(),
            ),
            appearance: Some(
                "큰 키에 넓은 어깨. 항상 소매를 걷어 올린 작업복 차림. 왼쪽 손목에 \
                 고등학교 때부터 찬 낡은 시계. 눈이 깊고, 웃을 때 눈이 가늘어진다. \
                 손이 크고 거칠지만 도면을 그릴 때는 놀랍도록 섬세하다."
                    .into(),
            ),
            secrets: Some(
                "서울을 떠난 건 커리어 때문이 아니다. 하윤이 떠난 뒤 해운리에 남은 \
                 영숙 할머니가 혼자 서점을 지키는 게 마음에 걸렸다. 할머니의 부탁으로 \
                 서점 구조 보수를 하면서 가까워졌고, 할머니가 돌아가시기 전 편지 한 \
                 통을 맡겼다 — 7년 전 도윤이 쓰고 전하지 못한 편지를."
                    .into(),
            ),
            motivation: Some(
                "하윤에게 7년 전 진실을 말하는 것. 졸업 전날 전하지 못한 마음, \
                 그리고 하윤이 모르는 사실 — 그날 아침 버스 정류장에 늦은 게 \
                 아니라, 편지를 들고 갔다가 떠나는 버스를 보고 돌아섰다는 것."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(200.0),
            graph_y: Some(-80.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_youngsuk,
            project_id,
            name: "서영숙".into(),
            personality: Some(
                "하윤의 외할머니. 75세에 타계. 편지와 서점에 남긴 흔적으로만 등장한다. \
                 파도서점을 40년간 운영하며 마을의 이야기꾼이었다. 따뜻하고 너그럽지만 \
                 고집이 있었다 — '사람도 파도처럼 떠났다 돌아오는 거란다'가 입버릇이었다. \
                 손녀와 도윤 사이의 마음을 누구보다 잘 알고 있었다."
                    .into(),
            ),
            appearance: Some(
                "사진으로 알려진 모습: 흰 머리를 낮게 묶고, 둥근 안경, 항상 앞치마를 \
                 두르고 있다. 서점 카운터에 앉아 책을 읽는 모습이 마을 사람들의 \
                 기억에 남아 있다."
                    .into(),
            ),
            secrets: Some(
                "도윤이 졸업 전날 쓴 편지를 가지고 있었다. 하윤이 떠난 아침, \
                 버스 정류장에서 돌아온 도윤에게서 받았다. '때가 되면 전해줄게'라고 \
                 했지만, 그 '때'를 기다리다 먼저 떠났다. 편지는 서점 어딘가에 숨겨져 있다."
                    .into(),
            ),
            motivation: Some(
                "죽어서도 편지를 통해 손녀를 해운리로, 진실로 이끈다. 서점을 남긴 건 \
                 재산이 아니라 돌아올 이유를 주기 위해서였다."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(-200.0),
            graph_y: Some(0.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_chaerin,
            project_id,
            name: "이채린".into(),
            personality: Some(
                "스물아홉 살. 해운리 토박이. 하윤의 고등학교 절친. 마을 카페 '만조'를 \
                 운영한다. 밝고 직설적이며, 분위기를 읽는 데 천재적이다. 하윤이 7년간 \
                 연락을 끊었던 것에 서운함이 있지만, 다시 만나면 아무 일 없던 것처럼 \
                 구는 타입. 속은 다르다."
                    .into(),
            ),
            appearance: Some(
                "파마 머리에 밝은 표정. 카페 앞치마에 항상 마카롱 가루가 묻어 있다. \
                 큰 귀걸이를 좋아하고, 웃음소리가 카페 밖까지 들린다."
                    .into(),
            ),
            secrets: Some(
                "하윤이 떠나고 혼자 남겨진 게 힘들었다. 카페를 연 것도 혼자 있기 \
                 싫어서였다. 하윤에게 '왜 떠났냐'고 묻고 싶지만, 대답이 자기가 \
                 아닐까 봐 묻지 못한다."
                    .into(),
            ),
            motivation: Some(
                "하윤과의 우정을 되찾는 것. 그리고 이번에는 하윤이 떠나면 붙잡을 \
                 것이다 — 아니면 최소한 이유는 들을 것이다."
                    .into(),
            ),
            profile_image_url: None,
            graph_x: Some(200.0),
            graph_y: Some(80.0),
            created_at: now,
            updated_at: now,
        },
        Character {
            id: char_junseo,
            project_id,
            name: "박준서".into(),
            personality: Some(
                "서른두 살. 도윤의 어릴 때부터 친구. 해운리 수산시장에서 아버지의 \
                 횟집을 물려받아 운영한다. 순박하고 의리 있으며, 목소리가 크고 \
                 웃음이 시원하다. 누구와도 금방 친해지는 사교적 성격이지만, 채린 \
                 앞에서만 말수가 줄어든다."
                    .into(),
            ),
            appearance: Some(
                "떡벌어진 체격에 햇볕에 그을린 피부. 항상 고무장화를 신고 다닌다. \
                 앞머리를 올려 넘기고, 웃으면 하얀 이가 드러난다. 손이 크고 \
                 악수가 세다."
                    .into(),
            ),
            secrets: Some(
                "채린을 고등학교 때부터 좋아했다. 모두가 아는 공공연한 비밀이지만, \
                 정작 채린에게 고백한 적은 없다. '타이밍'을 기다린다고 하지만, \
                 사실은 거절이 두렵다."
                    .into(),
            ),
            motivation: Some(
                "채린에게 마음을 전하는 것. 도윤과 하윤을 보면서 용기를 얻으려 \
                 하지만, 매번 '다음에'로 미룬다. 횟집에서 모임을 만들어 자연스럽게 \
                 채린과 시간을 보내려는 소소한 전략을 세운다."
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
        // ── Track 1: 현재 — 하윤의 귀향 ────────────────────────────────
        SampleScene {
            id: scene1,
            track_id: track_present,
            project_id,
            start_position: 0.0,
            duration: 1.0,
            status: SceneStatus::Edited,
            title: "파도서점".into(),
            plot_summary: Some(
                "하윤이 7년 만에 해운리에 도착한다. 시외버스에서 내리자 바다 냄새가 \
                 먼저 맞는다. 외할머니가 남긴 파도서점은 먼지와 추억으로 가득하다. \
                 카운터 위에 할머니의 편지가 놓여 있다: '하윤아, 서점은 네 거란다. \
                 서두르지 마. 천천히 둘러보렴.' 서점을 둘러보며 할머니의 흔적을 하나씩 \
                 발견한다 — 책갈피 사이의 메모, 계산대 옆의 라디오, 항상 틀어놓던 \
                 트로트 CD."
                    .into(),
            ),
            location: Some("파도서점, 해운리 중심가".into()),
            mood_tags: vec!["향수".into(), "쓸쓸함".into(), "따뜻함".into()],
            content: Some(SCENE1_CONTENT.into()),
            character_ids: vec![char_hayoon],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene2,
            track_id: track_present,
            project_id,
            start_position: 1.0,
            duration: 1.0,
            status: SceneStatus::AiDraft,
            title: "재회".into(),
            plot_summary: Some(
                "서점 리모델링 상담을 위해 건축가가 온다 — 강도윤. 7년 만의 재회. \
                 도윤은 프로페셔널하게 대하려 하지만 어색함을 감추지 못한다. 서점의 \
                 구조를 설명하면서 이 건물에 대해 너무 잘 알고 있다는 게 드러난다. \
                 하윤이 '여기 자주 왔어?'라고 묻자, 도윤이 잠깐 멈춘다. '영숙 \
                 할머니랑 가까웠으니까.' 하윤은 그의 달라진 모습 — 넓어진 어깨, \
                 거칠어진 손 — 과 변하지 않은 습관 — 생각할 때 왼쪽 귀를 만지는 \
                 버릇 — 에 흔들린다."
                    .into(),
            ),
            location: Some("파도서점, 오전".into()),
            mood_tags: vec!["긴장".into(), "설렘".into(), "어색함".into()],
            content: Some(SCENE2_CONTENT.into()),
            character_ids: vec![char_hayoon, char_doyoon],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene3,
            track_id: track_present,
            project_id,
            start_position: 2.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "조수".into(),
            plot_summary: Some(
                "채린이 하윤을 찾아온다. 카페 '만조'의 마카롱 상자를 들고. 반가움과 \
                 서운함이 동시에 터진다. '7년이야, 서하윤. 7년.' 화해 후 카페에서 \
                 마을 이야기를 듣는다. 준서가 회를 배달 온 김에 합류한다. 채린이 \
                 무심하게: '도윤이 서울에서 잘나갔는데 갑자기 돌아왔어. 니 떠나고 나서 \
                 얼마 안 돼서.' 하윤이 커피잔을 내려놓는 손이 멈춘다. 준서가 \
                 분위기를 읽고 화제를 돌리지만, 채린의 눈은 하윤의 반응을 놓치지 않는다."
                    .into(),
            ),
            location: Some("카페 '만조', 해운리 항구 옆".into()),
            mood_tags: vec!["반가움".into(), "서운함".into(), "떠보기".into()],
            content: None,
            character_ids: vec![char_hayoon, char_chaerin, char_junseo],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene4,
            track_id: track_present,
            project_id,
            start_position: 3.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "밀물".into(),
            plot_summary: Some(
                "서점 리모델링이 시작된다. 매일 가까이에서 일하면서 어색함이 조금씩 \
                 녹는다. 도윤이 벽지를 뜯다가 벽 틈에서 영숙 할머니가 숨겨둔 상자를 \
                 발견한다. 안에는 사진, 메모, 그리고 봉해진 편지 한 통. 겉면에 \
                 할머니 글씨로 '때가 되면'. 도윤이 상자를 하윤에게 건네면서 손이 \
                 스친다. 둘 다 알아챈다. 둘 다 모른 척한다. 준서가 점심에 회를 \
                 가져와서 셋이 서점 바닥에 신문지 깔고 앉아 먹는다. 도윤이 웃는 \
                 걸 하윤이 옆눈으로 본다 — 7년 전 그 웃음이다."
                    .into(),
            ),
            location: Some("파도서점, 리모델링 중".into()),
            mood_tags: vec!["가까워짐".into(), "발견".into(), "설렘".into()],
            content: None,
            character_ids: vec![char_hayoon, char_doyoon, char_junseo],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene5,
            track_id: track_present,
            project_id,
            start_position: 4.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "고백 미수".into(),
            plot_summary: Some(
                "해운리 여름 축제. 넷이 함께 다니다 불꽃놀이 때 자연스럽게 둘씩 \
                 갈린다 — 준서와 채린, 하윤과 도윤. 방파제 위에서 불꽃을 보며 \
                 도윤이 말을 꺼낸다. '하윤아, 그때 — ' 하윤의 핸드폰이 울린다. \
                 서울의 전 직장 선배. 복귀 제안. '네 자리 아직 있어.' 하윤이 \
                 전화를 받으러 자리를 뜬다. 돌아왔을 때 도윤은 바다를 보고 있다. \
                 '아까 뭐라고 하려 했어?' '아니, 별거 아니야.' 같은 시각, 준서가 \
                 채린에게 귀걸이를 선물하려다 주머니에서 떨어뜨린다. 채린이 주워주며 \
                 '이거 나 주려고?' 준서가 얼어붙는다."
                    .into(),
            ),
            location: Some("해운리 방파제, 여름 축제".into()),
            mood_tags: vec!["축제".into(), "아쉬움".into(), "엇갈림".into()],
            content: None,
            character_ids: vec![char_hayoon, char_doyoon, char_chaerin, char_junseo],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene6,
            track_id: track_present,
            project_id,
            start_position: 5.0,
            duration: 1.5,
            status: SceneStatus::Empty,
            title: "파도가 돌아오듯".into(),
            plot_summary: Some(
                "리모델링 완성 날. 새로 단장한 파도서점이 햇살 속에 빛난다. 하윤은 \
                 서울행 짐을 싸야 하지만 손이 움직이지 않는다. 할머니 상자에서 \
                 발견한 '때가 되면' 편지를 연다 — 안에 편지가 두 통이다. 할머니의 \
                 편지: '사람도 파도처럼 떠났다 돌아오는 거란다. 이 편지는 네가 \
                 돌아온 후에야 의미가 있어. 동봉한 편지는 7년 전 도윤이가 너한테 \
                 쓴 거야. 할머니가 대신 가지고 있었어. 미안하다.' 도윤의 편지를 \
                 읽는다. 서점으로 달려가면 도윤이 마지막 마감 작업을 하고 있다. \
                 '이 편지... 그때 쓴 거야?' 도윤이 하윤을 본다. 마침내 7년 \
                 전의 말을 한다. 하윤이 선택한다 — 이번에는 버스를 타지 않는다."
                    .into(),
            ),
            location: Some("파도서점 — 리모델링 완성 날".into()),
            mood_tags: vec!["클라이맥스".into(), "고백".into(), "선택".into()],
            content: None,
            character_ids: vec![char_hayoon, char_doyoon, char_youngsuk],
            created_at: now,
            updated_at: now,
        },
        // ── Track 2: 7년 전 — 그해 여름 ────────────────────────────────
        SampleScene {
            id: scene7,
            track_id: track_past,
            project_id,
            start_position: 1.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "그해 여름의 시작".into(),
            plot_summary: Some(
                "7년 전, 고3 여름. 하윤과 도윤이 파도서점에서 나란히 앉아 수능 \
                 공부를 하던 시절. 아직 '친구'. 도윤이 하윤의 교과서 구석에 그린 \
                 낙서를 발견하고 웃는다 — 파도를 타는 고양이. '너 이런 거 그릴 \
                 줄 알았어?' '몰랐지. 나도 몰랐어.' 영숙 할머니가 팥빙수를 \
                 만들어 오며 둘을 본다. 의미심장한 미소. '너희 둘은 참 보기 \
                 좋다.' 도윤의 귀가 빨개진다. 하윤은 못 본 척한다. 채린이 \
                 카페 아르바이트를 마치고 합류하면서: '야, 도윤이 얼굴 왜 그래?'"
                    .into(),
            ),
            location: Some("파도서점, 7년 전 여름".into()),
            mood_tags: vec!["청춘".into(), "설렘".into(), "순수".into()],
            content: None,
            character_ids: vec![char_hayoon, char_doyoon, char_youngsuk, char_chaerin],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene8,
            track_id: track_past,
            project_id,
            start_position: 3.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "비가 오던 밤".into(),
            plot_summary: Some(
                "여름 소나기에 파도서점에 갇힌 밤. 할머니는 이미 집에 갔고, 둘만 \
                 남았다. 정전이 되어 할머니가 둔 양초를 켠다. 촛불 아래서 책 대신 \
                 서로의 이야기를 한다 — 하윤은 서울에서 편집자가 되고 싶다고, \
                 도윤은 이 마을의 건물을 하나씩 고치고 싶다고. 빗소리가 잦아들 \
                 무렵, 도윤이 조용히 묻는다. '너 서울 가면... 나 잊을 거지?' \
                 하윤이 대답하지 못한다. 대답하지 못한 게 아니라, 대답이 \
                 '아니'라는 걸 말하기가 무서웠다. 비가 그치고 하윤이 먼저 일어난다. \
                 '늦었다, 가야지.' 도윤이 고개를 끄덕인다. 둘 다 우산은 쓰지 않는다."
                    .into(),
            ),
            location: Some("파도서점, 7년 전 여름 — 비 오는 밤".into()),
            mood_tags: vec!["고요".into(), "긴장".into(), "아련함".into()],
            content: None,
            character_ids: vec![char_hayoon, char_doyoon],
            created_at: now,
            updated_at: now,
        },
        SampleScene {
            id: scene9,
            track_id: track_past,
            project_id,
            start_position: 4.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: "전하지 못한 편지".into(),
            plot_summary: Some(
                "졸업 전날 밤. 도윤이 파도서점 카운터에 앉아 편지를 쓴다. 몇 번이고 \
                 구기고 다시 쓴다. 하윤에게 하고 싶은 말 — 좋아한다는 것, 기다릴 \
                 수 있다는 것, 떠나도 괜찮다는 것. 아침. 하윤은 일찍 서울행 \
                 버스를 탄다. 도윤이 편지를 들고 정류장에 도착했을 때, 버스의 \
                 뒷모습만 보인다. 영숙 할머니가 서점 앞을 쓸다가 돌아오는 도윤을 \
                 본다. 손에 든 편지를 본다. '할머니, 이거...' '내가 가지고 \
                 있을게. 때가 되면 전해줄게.' 도윤이 고개를 숙인다. 할머니가 \
                 편지를 받아 앞치마 주머니에 넣는다."
                    .into(),
            ),
            location: Some("해운리 버스 정류장 + 파도서점, 졸업 다음 날 아침".into()),
            mood_tags: vec!["이별".into(), "미련".into(), "약속".into()],
            content: None,
            character_ids: vec![char_hayoon, char_doyoon, char_youngsuk],
            created_at: now,
            updated_at: now,
        },
    ];

    // ── Relationships ──────────────────────────────────────────────────
    let relationships = build_relationships(
        project_id,
        now,
        vec![
            (
                char_hayoon,
                char_doyoon,
                "첫사랑 / 재회",
                RelationshipVisual::Solid,
                RelationshipDirection::Bidirectional,
            ),
            (
                char_youngsuk,
                char_hayoon,
                "외할머니 → 손녀",
                RelationshipVisual::Arrowed,
                RelationshipDirection::AToB,
            ),
            (
                char_hayoon,
                char_chaerin,
                "절친 / 재회",
                RelationshipVisual::Dashed,
                RelationshipDirection::Bidirectional,
            ),
            (
                char_doyoon,
                char_junseo,
                "죽마고우",
                RelationshipVisual::Solid,
                RelationshipDirection::Bidirectional,
            ),
            (
                char_junseo,
                char_chaerin,
                "짝사랑",
                RelationshipVisual::Arrowed,
                RelationshipDirection::AToB,
            ),
            (
                char_youngsuk,
                char_doyoon,
                "편지의 보관자",
                RelationshipVisual::Dashed,
                RelationshipDirection::Bidirectional,
            ),
        ],
    );

    // ── Connections ────────────────────────────────────────────────────
    let connections = vec![
        // Branch: 고백 미수 → 비가 오던 밤 (현재의 미수가 과거의 밤과 겹친다)
        SceneConnection {
            id: Uuid::new_v4(),
            project_id,
            source_scene_id: scene5,
            target_scene_id: scene8,
            connection_type: ConnectionType::Branch,
            created_at: now,
        },
        // Merge: 전하지 못한 편지 → 파도가 돌아오듯 (과거의 편지가 현재 클라이맥스로)
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
시외버스에서 내리자 바다 냄새가 먼저 왔다. 소금기와 비릿함이 섞인, 해운리만의 냄새.

7년이면 많은 게 변한다. 정류장 옆의 슈퍼는 편의점이 되었고, 중학교 앞 문방구는 \
사라졌다. 하지만 골목 끝에서 바다가 보이는 건 그대로였고, 파도서점의 낡은 간판도 \
그대로였다.

열쇠가 잘 돌아가지 않았다. 세 번째 시도에서 뻑뻑하게 열렸다.

먼지 냄새, 오래된 종이 냄새, 그리고 — 할머니 냄새. 설명할 수 없지만 분명한, \
라벤더와 누룽지 사이 어딘가의 냄새.

서점은 작았다. 어릴 때는 거대하게 느껴졌는데, 어른이 되어 보니 거실 두 개 크기. \
바닥부터 천장까지 빽빽한 책장, 카운터 위의 낡은 라디오, 'Radio Garden'이라고 \
적힌 포스트잇이 붙어 있다 — 할머니가 좋아하던 인터넷 라디오.

카운터 위에 봉투가 놓여 있었다. 할머니의 동글동글한 글씨.

'하윤아, 서점은 네 거란다. 서두르지 마. 천천히 둘러보렴.'

하윤은 봉투를 내려놓고 서점을 둘러보았다.

책갈피 사이사이에 할머니의 메모가 끼어 있었다. '이 책 좋음', '도윤이한테 추천', \
'하윤이 오면 읽히기'. 계산대 서랍 안에는 반쯤 먹다 만 유자차 스틱과, 수첩 한 \
권. 수첩을 펼치니 매출 기록 사이에 일기 같은 문장이 적혀 있었다.

'오늘 도윤이가 서점 벽 점검해줌. 하윤이 닮은 뒒모습.'

'뒒모습'이 아니라 '뒷모습'이겠지, 할머니.

하윤은 수첩을 덮었다. 코끝이 시큰거렸다.

서점 유리창 너머로 해가 지고 있었다. 바다가 주황빛으로 물들었다.

7년 만에 돌아온 해운리는 달라진 것도 있었고, 달라지지 않은 것도 있었다. \
달라지지 않은 것들이 더 아팠다.";

const SCENE2_CONTENT: &str = "\
노크 소리에 고개를 들었다.

서점 유리문 너머에 남자가 서 있었다. 역광이라 얼굴이 잘 안 보였다. 키가 크고 \
어깨가 넓었다. 소매를 걷어 올린 작업복 차림.

문을 열었다. 빛이 걷히면서 얼굴이 보였다.

하윤의 손이 문손잡이 위에서 멈췄다.

'...도윤?'

강도윤이 서 있었다. 7년 전보다 얼굴이 각졌고, 어깨가 넓어졌고, 손이 거칠어졌다. \
하지만 눈은 그대로였다. 깊고, 조용하고, 뭔가를 참고 있는 것 같은 눈.

'오랜만이다.' 그가 말했다. 목소리가 낮아졌다.

'어떻게 여기...'

'리모델링 의뢰받았어. 영숙 할머니 생전에.' 잠깐 멈칫했다. '너 온다는 건 \
몰랐어.'

거짓말인지 진짜인지 판단이 안 됐다. 도윤은 원래 그랬다 — 중요한 건 표정에 \
안 드러내는 사람.

그가 서점 안으로 들어왔다. 벽을 두드리고, 바닥을 밟아보고, 천장의 누수 자국을 \
확인했다. 서점의 구조를 너무 잘 알고 있었다. 어디에 무엇이 있는지, 어느 벽이 \
하중을 받는지, 뒷문이 여름에 뻑뻑해지는 것까지.

'여기 자주 왔어?'

'영숙 할머니랑 가까웠으니까.'

설명이 되면서도 안 되는 대답이었다. 건축가가 서점의 습기 패턴까지 아는 건 \
'가까웠으니까'로 설명되지 않는다.

도윤이 카운터 옆 벽을 재면서 뭔가를 메모했다. 생각할 때 왼쪽 귀를 만지는 \
버릇. 7년 전에도 그랬다. 수학 문제가 안 풀릴 때, 하고 싶은 말이 있을 때.

'벽지는 전부 뜯어야 해. 배관도 일부 교체하고.' 그가 말했다. 프로페셔널한 \
톤. '2주 정도 걸릴 거야.'

'2주 동안 매일 와?'

'매일은 아니고. 거의 매일.'

하윤은 고개를 끄덕였다. 괜찮은 척. 7년 만에 다시 만난 사람이 2주간 매일 올 \
거라는 말에 괜찮은 척.

도윤이 나가면서 문 앞에서 멈췄다. 뒤를 돌아보지 않고 말했다.

'서점, 좋은 뼈대야. 할머니가 잘 지킨 거야.'

문이 닫혔다. 종이 울렸다. 작은 소리.

하윤은 도윤이 서 있던 자리를 봤다. 작업화 자국이 먼지 위에 찍혀 있었다. \
크고 또렷한 발자국.

7년간 떠올리지 않으려 했던 사람이 2주간 매일 온다.

괜찮을 리가 없었다.";
