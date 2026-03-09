use super::models::GenerationContext;

/// Builds LLM prompts from a `GenerationContext` for web novel scene generation.
pub struct PromptBuilder;

impl PromptBuilder {
    /// Build a system prompt for scene generation.
    pub fn system_prompt(ctx: &GenerationContext, locale: &str) -> String {
        match locale {
            "ko" => Self::system_prompt_ko(ctx),
            _ => Self::system_prompt_en(ctx),
        }
    }

    fn system_prompt_ko(ctx: &GenerationContext) -> String {
        let mut parts = vec![
            "당신은 한국 웹소설 전문 작가입니다. \
             주어진 컨텍스트(장르, 톤, 시점, 캐릭터 정보, 이전 줄거리 요약)를 바탕으로 \
             지정된 장면의 본문을 작성합니다."
                .to_string(),
            "\n\n## 작성 규칙".to_string(),
            "- 한국어로 작성하되, 고유명사나 외래어는 원어 그대로 사용 가능".to_string(),
            "- 묘사와 대화를 균형 있게 배치".to_string(),
            "- 장면의 분위기(mood_tags)에 맞는 문체 사용".to_string(),
            "- 캐릭터의 성격, 동기, 비밀을 반영한 행동과 대사".to_string(),
            "- 이전 장면과의 연속성 유지".to_string(),
            "- 동시 진행 장면이 있다면 시간적 정합성 유지".to_string(),
        ];

        if let Some(ref pov) = ctx.project.pov {
            let pov_instruction = match pov {
                crate::domain::project::models::PovType::FirstPerson => {
                    "- 시점: 1인칭 시점으로 작성. 주인공의 내면 독백과 감정을 중심으로."
                }
                crate::domain::project::models::PovType::ThirdLimited => {
                    "- 시점: 3인칭 제한 시점. 초점 인물의 생각과 감정만 서술."
                }
                crate::domain::project::models::PovType::ThirdOmniscient => {
                    "- 시점: 3인칭 전지 시점. 필요에 따라 여러 인물의 내면 서술 가능."
                }
            };
            parts.push(pov_instruction.to_string());
        }

        parts.push("\n\n## 출력 형식".to_string());
        parts.push("- 장면 본문만 출력 (제목, 메타데이터 제외)".to_string());
        parts.push("- 마크다운 없이 순수 텍스트".to_string());

        parts.join("\n")
    }

    fn system_prompt_en(ctx: &GenerationContext) -> String {
        let mut parts = vec![
            "You are a professional web novel writer. \
             Based on the given context (genre, tone, POV, character info, previous plot summaries), \
             write the prose for the specified scene."
                .to_string(),
            "\n\n## Writing Rules".to_string(),
            "- Write entirely in English".to_string(),
            "- Balance description and dialogue".to_string(),
            "- Use a writing style that matches the scene's mood (mood_tags)".to_string(),
            "- Reflect each character's personality, motivation, and secrets in their actions and dialogue".to_string(),
            "- Maintain continuity with preceding scenes".to_string(),
            "- If there are simultaneous scenes, maintain temporal consistency".to_string(),
        ];

        if let Some(ref pov) = ctx.project.pov {
            let pov_instruction = match pov {
                crate::domain::project::models::PovType::FirstPerson => {
                    "- POV: Write in first-person. Focus on the protagonist's inner monologue and emotions."
                }
                crate::domain::project::models::PovType::ThirdLimited => {
                    "- POV: Write in third-person limited. Only narrate the focal character's thoughts and feelings."
                }
                crate::domain::project::models::PovType::ThirdOmniscient => {
                    "- POV: Write in third-person omniscient. Narrate multiple characters' inner thoughts as needed."
                }
            };
            parts.push(pov_instruction.to_string());
        }

        parts.push("\n\n## Output Format".to_string());
        parts.push("- Output only the scene prose (no title, no metadata)".to_string());
        parts.push("- Plain text without markdown".to_string());

        parts.join("\n")
    }

    /// Build a user prompt for scene generation.
    pub fn user_prompt(ctx: &GenerationContext, locale: &str) -> String {
        match locale {
            "ko" => Self::user_prompt_ko(ctx),
            _ => Self::user_prompt_en(ctx),
        }
    }

    fn user_prompt_ko(ctx: &GenerationContext) -> String {
        let mut parts = vec![
            "## 작품 설정".to_string(),
            format!("- 제목: {}", ctx.project.title),
        ];
        if let Some(ref genre) = ctx.project.genre {
            parts.push(format!("- 장르: {genre}"));
        }
        if let Some(ref theme) = ctx.project.theme {
            parts.push(format!("- 주제: {theme}"));
        }
        if let Some(ref era) = ctx.project.era_location {
            parts.push(format!("- 시대/배경: {era}"));
        }
        if let Some(ref tone) = ctx.project.tone {
            parts.push(format!("- 톤: {tone}"));
        }

        if !ctx.characters.is_empty() {
            parts.push("\n## 등장인물".to_string());
            for ch in &ctx.characters {
                parts.push(format!("\n### {}", ch.name));
                if let Some(ref p) = ch.personality {
                    parts.push(format!("- 성격: {p}"));
                }
                if let Some(ref a) = ch.appearance {
                    parts.push(format!("- 외모: {a}"));
                }
                if let Some(ref m) = ch.motivation {
                    parts.push(format!("- 동기: {m}"));
                }
                if let Some(ref s) = ch.secrets {
                    parts.push(format!("- 비밀: {s}"));
                }
            }
        }

        if !ctx.relationships.is_empty() {
            parts.push("\n## 인물 관계".to_string());
            Self::push_relationships(&mut parts, ctx);
        }

        if !ctx.preceding_summaries.is_empty() {
            parts.push("\n## 이전 장면 요약 (시간순)".to_string());
            for (i, summary) in ctx.preceding_summaries.iter().enumerate() {
                parts.push(format!("{}. {}", i + 1, summary.summary_text));
            }
        }

        if !ctx.simultaneous_scenes.is_empty() {
            parts.push("\n## 동시 진행 장면".to_string());
            for scene in &ctx.simultaneous_scenes {
                let summary = scene.plot_summary.as_deref().unwrap_or("(줄거리 없음)");
                parts.push(format!("- {}: {}", scene.title, summary));
            }
        }

        if let Some(ref next) = ctx.next_scene {
            parts.push("\n## 다음 장면 (참고)".to_string());
            let summary = next.plot_summary.as_deref().unwrap_or("(줄거리 없음)");
            parts.push(format!("- {}: {}", next.title, summary));
        }

        parts.push("\n## 작성할 장면".to_string());
        parts.push(format!("- 제목: {}", ctx.scene.title));
        if let Some(ref ps) = ctx.scene.plot_summary {
            parts.push(format!("- 줄거리: {ps}"));
        }
        if let Some(ref loc) = ctx.scene.location {
            parts.push(format!("- 장소: {loc}"));
        }
        if !ctx.scene.mood_tags.is_empty() {
            parts.push(format!("- 분위기: {}", ctx.scene.mood_tags.join(", ")));
        }

        parts.push("\n위 컨텍스트를 바탕으로 이 장면의 본문을 작성해주세요.".to_string());
        parts.join("\n")
    }

    fn user_prompt_en(ctx: &GenerationContext) -> String {
        let mut parts = vec![
            "## Story Settings".to_string(),
            format!("- Title: {}", ctx.project.title),
        ];
        if let Some(ref genre) = ctx.project.genre {
            parts.push(format!("- Genre: {genre}"));
        }
        if let Some(ref theme) = ctx.project.theme {
            parts.push(format!("- Theme: {theme}"));
        }
        if let Some(ref era) = ctx.project.era_location {
            parts.push(format!("- Era/Setting: {era}"));
        }
        if let Some(ref tone) = ctx.project.tone {
            parts.push(format!("- Tone: {tone}"));
        }

        if !ctx.characters.is_empty() {
            parts.push("\n## Characters".to_string());
            for ch in &ctx.characters {
                parts.push(format!("\n### {}", ch.name));
                if let Some(ref p) = ch.personality {
                    parts.push(format!("- Personality: {p}"));
                }
                if let Some(ref a) = ch.appearance {
                    parts.push(format!("- Appearance: {a}"));
                }
                if let Some(ref m) = ch.motivation {
                    parts.push(format!("- Motivation: {m}"));
                }
                if let Some(ref s) = ch.secrets {
                    parts.push(format!("- Secrets: {s}"));
                }
            }
        }

        if !ctx.relationships.is_empty() {
            parts.push("\n## Character Relationships".to_string());
            Self::push_relationships(&mut parts, ctx);
        }

        if !ctx.preceding_summaries.is_empty() {
            parts.push("\n## Previous Scene Summaries (chronological)".to_string());
            for (i, summary) in ctx.preceding_summaries.iter().enumerate() {
                parts.push(format!("{}. {}", i + 1, summary.summary_text));
            }
        }

        if !ctx.simultaneous_scenes.is_empty() {
            parts.push("\n## Simultaneous Scenes".to_string());
            for scene in &ctx.simultaneous_scenes {
                let summary = scene.plot_summary.as_deref().unwrap_or("(no summary)");
                parts.push(format!("- {}: {}", scene.title, summary));
            }
        }

        if let Some(ref next) = ctx.next_scene {
            parts.push("\n## Next Scene (reference)".to_string());
            let summary = next.plot_summary.as_deref().unwrap_or("(no summary)");
            parts.push(format!("- {}: {}", next.title, summary));
        }

        parts.push("\n## Scene to Write".to_string());
        parts.push(format!("- Title: {}", ctx.scene.title));
        if let Some(ref ps) = ctx.scene.plot_summary {
            parts.push(format!("- Plot: {ps}"));
        }
        if let Some(ref loc) = ctx.scene.location {
            parts.push(format!("- Location: {loc}"));
        }
        if !ctx.scene.mood_tags.is_empty() {
            parts.push(format!("- Mood: {}", ctx.scene.mood_tags.join(", ")));
        }

        parts.push("\nBased on the context above, write the prose for this scene.".to_string());
        parts.join("\n")
    }

    fn push_relationships(parts: &mut Vec<String>, ctx: &GenerationContext) {
        for rel in &ctx.relationships {
            let a_name = ctx
                .characters
                .iter()
                .find(|c| c.id == rel.character_a_id)
                .map(|c| c.name.as_str())
                .unwrap_or("?");
            let b_name = ctx
                .characters
                .iter()
                .find(|c| c.id == rel.character_b_id)
                .map(|c| c.name.as_str())
                .unwrap_or("?");
            parts.push(format!("- {a_name} <-> {b_name}: {}", rel.label));
        }
    }

    /// Build prompts for direction-based editing.
    pub fn edit_system_prompt(locale: &str) -> String {
        match locale {
            "ko" => "당신은 한국 웹소설 편집 전문가입니다. \
                사용자의 편집 지시에 따라 기존 본문을 수정합니다.\n\n\
                ## 규칙\n\
                - 지시된 부분만 수정하고, 나머지는 최대한 유지\n\
                - 문체와 톤의 일관성 유지\n\
                - 수정된 전체 본문을 출력 (변경된 부분만이 아닌 전체)\n\
                - 마크다운 없이 순수 텍스트"
                .to_string(),
            _ => "You are a professional web novel editing expert. \
                Revise the existing text according to the user's edit direction.\n\n\
                ## Rules\n\
                - Only modify the directed parts; preserve the rest as much as possible\n\
                - Maintain consistency in style and tone\n\
                - Output the entire revised text (not just the changed parts)\n\
                - Plain text without markdown"
                .to_string(),
        }
    }

    /// Build a user prompt for direction-based editing.
    pub fn edit_user_prompt(
        content: &str,
        selected_text: Option<&str>,
        direction: &str,
        locale: &str,
    ) -> String {
        match locale {
            "ko" => {
                let mut parts = vec![
                    "## 현재 본문".to_string(),
                    content.to_string(),
                ];
                if let Some(selected) = selected_text {
                    parts.push(format!("\n## 선택된 텍스트\n{selected}"));
                }
                parts.push(format!("\n## 편집 지시\n{direction}"));
                parts.push("\n위 지시에 따라 수정된 전체 본문을 작성해주세요.".to_string());
                parts.join("\n")
            }
            _ => {
                let mut parts = vec![
                    "## Current Text".to_string(),
                    content.to_string(),
                ];
                if let Some(selected) = selected_text {
                    parts.push(format!("\n## Selected Text\n{selected}"));
                }
                parts.push(format!("\n## Edit Direction\n{direction}"));
                parts.push("\nPlease write the entire revised text based on the direction above.".to_string());
                parts.join("\n")
            }
        }
    }

    /// System prompt for project structuring — instructs LLM to output JSON.
    /// `locale` controls the language of all text values in the output JSON.
    pub fn structure_system_prompt(locale: &str) -> String {
        let lang_instruction = match locale {
            "ko" => "- 모든 텍스트 값(title, personality, plot_summary 등)은 반드시 한국어로 작성",
            _ => "- All text values (title, personality, plot_summary, etc.) MUST be written in English",
        };

        format!(
            "당신은 이야기 구조 분석 전문가입니다. \
             사용자의 이야기 아이디어를 분석하여 구조화된 요소를 추출합니다.\n\n\
             ## 규칙\n\
             - 유효한 JSON만 출력 (마크다운, 설명 없이)\n\
             {lang_instruction}\n\
             - JSON 스키마: {{ \"title\": string, \"genre\": string|null, \"theme\": string|null, \
               \"era_location\": string|null, \
               \"pov\": \"first_person\"|\"third_limited\"|\"third_omniscient\"|null, \
               \"tone\": string|null, \
               \"characters\": [{{\"name\": string, \"personality\": string|null, \
               \"appearance\": string|null, \"secrets\": string|null, \"motivation\": string|null}}], \
               \"relationships\": [{{\"character_a\": string, \"character_b\": string, \
               \"label\": string, \"direction\": \"bidirectional\"|\"a_to_b\"|\"b_to_a\"|null}}], \
               \"tracks\": [{{\"label\": string|null, \
               \"scenes\": [{{\"title\": string, \"plot_summary\": string|null, \
               \"location\": string|null, \"mood_tags\": [string]|null, \
               \"characters\": [string]|null}}]}}] }}\n\
             - 이야기에 맞춰 3-8명의 등장인물 생성\n\
             - 1-3개의 트랙(병렬 스토리라인) 생성\n\
             - 트랙당 3-10개의 장면 생성\n\
             - 텍스트에서 장르, 주제, 시대/배경, 시점, 톤을 추론"
        )
    }

    /// Build a user prompt for project structuring.
    pub fn structure_user_prompt(
        source_input: &str,
        clarification_answers: Option<&[String]>,
    ) -> String {
        let mut parts = vec![
            "## 원본 텍스트".to_string(),
            source_input.to_string(),
        ];

        if let Some(answers) = clarification_answers {
            if !answers.is_empty() {
                parts.push("\n## 추가 답변".to_string());
                for (i, answer) in answers.iter().enumerate() {
                    parts.push(format!("{}. {}", i + 1, answer));
                }
            }
        }

        parts.push(
            "\n위 텍스트를 분석하여 구조화된 JSON을 출력해주세요.".to_string(),
        );

        parts.join("\n")
    }

    /// Phase 1 system prompt: extract world/setting metadata.
    pub fn world_system_prompt(locale: &str) -> String {
        let lang_instruction = match locale {
            "ko" => "- 모든 텍스트는 반드시 한국어로 작성",
            _ => "- All text MUST be written in English",
        };

        format!(
            "당신은 이야기 세계관 분석 전문가입니다. \
             사용자의 이야기 아이디어에서 작품의 세계관과 설정을 추출합니다.\n\n\
             ## 규칙\n\
             {lang_instruction}\n\
             - 텍스트에서 장르, 주제, 시대/배경, 시점, 톤을 추론\n\
             - 작품 제목을 이야기에 맞게 생성\n\n\
             ## 출력 형식\n\
             1. 먼저 분석한 세계관을 자연스러운 문장으로 설명 (배경, 시대, 분위기, 장르적 특성)\n\
             2. 마지막에 ```json 블록으로 구조화된 JSON 출력\n\n\
             JSON 스키마: {{ \"title\": string, \"genre\": string|null, \"theme\": string|null, \
               \"era_location\": string|null, \
               \"pov\": \"first_person\"|\"third_limited\"|\"third_omniscient\"|null, \
               \"tone\": string|null }}"
        )
    }

    /// Phase 1 user prompt: source text + optional clarifications.
    pub fn world_user_prompt(
        source_input: &str,
        clarification_answers: Option<&[String]>,
    ) -> String {
        let mut parts = vec![
            "## 원본 텍스트".to_string(),
            source_input.to_string(),
        ];

        if let Some(answers) = clarification_answers {
            if !answers.is_empty() {
                parts.push("\n## 추가 답변".to_string());
                for (i, answer) in answers.iter().enumerate() {
                    parts.push(format!("{}. {}", i + 1, answer));
                }
            }
        }

        parts.push(
            "\n위 텍스트의 세계관과 설정을 분석하여 출력해주세요.".to_string(),
        );

        parts.join("\n")
    }

    /// Phase 2 system prompt: extract characters + relationships using world context.
    pub fn characters_system_prompt(locale: &str) -> String {
        let lang_instruction = match locale {
            "ko" => "- 모든 텍스트는 반드시 한국어로 작성",
            _ => "- All text MUST be written in English",
        };

        format!(
            "당신은 이야기 등장인물 분석 전문가입니다. \
             주어진 세계관과 이야기에서 등장인물과 관계를 추출합니다.\n\n\
             ## 규칙\n\
             {lang_instruction}\n\
             - 세계관에 맞는 3-8명의 등장인물 생성\n\
             - 등장인물 간 핵심 관계를 모두 추출\n\
             - 세계관의 시대/배경에 어울리는 캐릭터 설계\n\n\
             ## 출력 형식\n\
             1. 먼저 등장인물과 관계를 자연스러운 문장으로 설명\n\
             2. 마지막에 ```json 블록으로 구조화된 JSON 출력\n\n\
             JSON 스키마: {{ \
               \"characters\": [{{\"name\": string, \"personality\": string|null, \
               \"appearance\": string|null, \"secrets\": string|null, \"motivation\": string|null}}], \
               \"relationships\": [{{\"character_a\": string, \"character_b\": string, \
               \"label\": string, \"direction\": \"bidirectional\"|\"a_to_b\"|\"b_to_a\"|null}}] }}"
        )
    }

    /// Phase 2 user prompt: source text + world context from Phase 1.
    pub fn characters_user_prompt(
        source_input: &str,
        world_context: &str,
    ) -> String {
        vec![
            "## 원본 텍스트".to_string(),
            source_input.to_string(),
            "\n## 세계관 (Phase 1 결과)".to_string(),
            world_context.to_string(),
            "\n위 세계관과 스토리에서 등장인물과 관계를 분석하여 출력해주세요.".to_string(),
        ].join("\n")
    }

    /// Phase 3 system prompt: create timeline tracks + scenes.
    pub fn timeline_system_prompt(locale: &str) -> String {
        let lang_instruction = match locale {
            "ko" => "- 모든 텍스트는 반드시 한국어로 작성",
            _ => "- All text MUST be written in English",
        };

        format!(
            "당신은 이야기 타임라인 구성 전문가입니다. \
             주어진 세계관, 등장인물, 이야기를 바탕으로 타임라인을 구성합니다.\n\n\
             ## 규칙\n\
             {lang_instruction}\n\
             - 1-3개의 트랙(병렬 스토리라인) 생성\n\
             - 트랙당 3-10개의 장면 생성\n\
             - characters 배열에는 등장인물 이름 목록 포함\n\
             - 앞서 제공된 등장인물 이름과 일치하는 이름 사용\n\n\
             ## 출력 형식\n\
             1. 먼저 구성한 타임라인을 자연스러운 문장으로 설명 (트랙 구성, 주요 장면 흐름)\n\
             2. 마지막에 ```json 블록으로 구조화된 JSON 출력\n\n\
             JSON 스키마: {{ \"tracks\": [{{\"label\": string|null, \
               \"scenes\": [{{\"title\": string, \"plot_summary\": string|null, \
               \"location\": string|null, \"mood_tags\": [string]|null, \
               \"characters\": [string]|null}}]}}] }}"
        )
    }

    /// Phase 3 user prompt: source text + world context + characters context.
    pub fn timeline_user_prompt(
        source_input: &str,
        world_context: &str,
        characters_context: &str,
    ) -> String {
        vec![
            "## 원본 텍스트".to_string(),
            source_input.to_string(),
            "\n## 세계관 (Phase 1 결과)".to_string(),
            world_context.to_string(),
            "\n## 등장인물 (Phase 2 결과)".to_string(),
            characters_context.to_string(),
            "\n위 세계관과 등장인물을 바탕으로 타임라인 구조를 출력해주세요.".to_string(),
        ].join("\n")
    }

    /// Build prompts for scene summary generation.
    pub fn summary_system_prompt(locale: &str) -> String {
        match locale {
            "ko" => "당신은 소설 장면 요약 전문가입니다. \
                주어진 장면 본문을 2-3문장으로 압축 요약합니다.\n\n\
                ## 규칙\n\
                - 핵심 사건과 인물 행동 중심으로 요약\n\
                - 감정적 변화나 관계 변화 포함\n\
                - 다음 장면 작성에 필요한 맥락 정보 보존\n\
                - 한국어로 작성"
                .to_string(),
            _ => "You are a novel scene summary expert. \
                Condense the given scene text into a 2-3 sentence summary.\n\n\
                ## Rules\n\
                - Summarize around key events and character actions\n\
                - Include emotional or relationship changes\n\
                - Preserve context information needed for writing subsequent scenes\n\
                - Write in English"
                .to_string(),
        }
    }

    /// Build a user prompt for scene summary generation.
    pub fn summary_user_prompt(scene_title: &str, content: &str, locale: &str) -> String {
        match locale {
            "ko" => format!(
                "## 장면: {scene_title}\n\n\
                 {content}\n\n\
                 위 장면을 2-3문장으로 요약해주세요."
            ),
            _ => format!(
                "## Scene: {scene_title}\n\n\
                 {content}\n\n\
                 Summarize the scene above in 2-3 sentences."
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::ai::models::SceneSummary;
    use crate::domain::character::models::{
        Character, CharacterRelationship, RelationshipDirection, RelationshipVisual,
    };
    use crate::domain::project::models::{PovType, Project};
    use crate::domain::timeline::models::{Scene, SceneStatus};
    use chrono::Utc;
    use uuid::Uuid;

    fn make_project(pov: Option<PovType>) -> Project {
        Project {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            title: "테스트 소설".into(),
            genre: Some("판타지".into()),
            theme: Some("성장".into()),
            era_location: Some("중세 유럽".into()),
            pov,
            tone: Some("어두운".into()),
            source_type: None,
            source_input: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn make_scene(title: &str) -> Scene {
        Scene {
            id: Uuid::new_v4(),
            track_id: Uuid::new_v4(),
            project_id: Uuid::new_v4(),
            start_position: 0.0,
            duration: 1.0,
            status: SceneStatus::Empty,
            title: title.into(),
            plot_summary: Some("주인공이 마을을 떠난다".into()),
            location: Some("마을 광장".into()),
            mood_tags: vec!["긴장".into(), "결의".into()],
            content: None,
            character_ids: vec![],
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn make_ctx(pov: Option<PovType>) -> GenerationContext {
        GenerationContext {
            project: make_project(pov),
            scene: make_scene("출발"),
            characters: vec![],
            relationships: vec![],
            preceding_summaries: vec![],
            simultaneous_scenes: vec![],
            next_scene: None,
        }
    }

    // ---- system_prompt tests (Korean) ----

    #[test]
    fn system_prompt_ko_contains_role() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::system_prompt(&ctx, "ko");
        assert!(prompt.contains("한국 웹소설 전문 작가"));
    }

    #[test]
    fn system_prompt_ko_first_person_pov() {
        let ctx = make_ctx(Some(PovType::FirstPerson));
        let prompt = PromptBuilder::system_prompt(&ctx, "ko");
        assert!(prompt.contains("1인칭 시점"));
    }

    #[test]
    fn system_prompt_ko_third_limited_pov() {
        let ctx = make_ctx(Some(PovType::ThirdLimited));
        let prompt = PromptBuilder::system_prompt(&ctx, "ko");
        assert!(prompt.contains("3인칭 제한 시점"));
    }

    #[test]
    fn system_prompt_ko_third_omniscient_pov() {
        let ctx = make_ctx(Some(PovType::ThirdOmniscient));
        let prompt = PromptBuilder::system_prompt(&ctx, "ko");
        assert!(prompt.contains("3인칭 전지 시점"));
    }

    #[test]
    fn system_prompt_ko_no_pov_omits_instruction() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::system_prompt(&ctx, "ko");
        assert!(!prompt.contains("시점:"));
    }

    // ---- system_prompt tests (English) ----

    #[test]
    fn system_prompt_en_contains_role() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::system_prompt(&ctx, "en");
        assert!(prompt.contains("professional web novel writer"));
    }

    #[test]
    fn system_prompt_en_instructs_english() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::system_prompt(&ctx, "en");
        assert!(prompt.contains("English"));
    }

    #[test]
    fn system_prompt_en_first_person_pov() {
        let ctx = make_ctx(Some(PovType::FirstPerson));
        let prompt = PromptBuilder::system_prompt(&ctx, "en");
        assert!(prompt.contains("first-person"));
    }

    #[test]
    fn system_prompt_en_third_limited_pov() {
        let ctx = make_ctx(Some(PovType::ThirdLimited));
        let prompt = PromptBuilder::system_prompt(&ctx, "en");
        assert!(prompt.contains("third-person limited"));
    }

    #[test]
    fn system_prompt_en_third_omniscient_pov() {
        let ctx = make_ctx(Some(PovType::ThirdOmniscient));
        let prompt = PromptBuilder::system_prompt(&ctx, "en");
        assert!(prompt.contains("third-person omniscient"));
    }

    #[test]
    fn system_prompt_unknown_locale_defaults_to_english() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::system_prompt(&ctx, "fr");
        assert!(prompt.contains("English"));
    }

    // ---- user_prompt tests (Korean) ----

    #[test]
    fn user_prompt_ko_contains_project_info() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::user_prompt(&ctx, "ko");
        assert!(prompt.contains("테스트 소설"));
        assert!(prompt.contains("판타지"));
        assert!(prompt.contains("성장"));
        assert!(prompt.contains("중세 유럽"));
        assert!(prompt.contains("어두운"));
    }

    #[test]
    fn user_prompt_ko_contains_scene_info() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::user_prompt(&ctx, "ko");
        assert!(prompt.contains("출발"));
        assert!(prompt.contains("주인공이 마을을 떠난다"));
        assert!(prompt.contains("마을 광장"));
        assert!(prompt.contains("긴장, 결의"));
    }

    #[test]
    fn user_prompt_ko_with_characters() {
        let id_a = Uuid::new_v4();
        let mut ctx = make_ctx(None);
        ctx.characters = vec![
            Character {
                id: id_a, project_id: Uuid::new_v4(), name: "이수현".into(),
                personality: Some("용감한".into()), appearance: Some("키가 큰".into()),
                secrets: Some("과거의 죄".into()), motivation: Some("복수".into()),
                profile_image_url: None, graph_x: None, graph_y: None,
                created_at: Utc::now(), updated_at: Utc::now(),
            },
        ];
        let prompt = PromptBuilder::user_prompt(&ctx, "ko");
        assert!(prompt.contains("이수현"));
        assert!(prompt.contains("용감한"));
        assert!(prompt.contains("키가 큰"));
        assert!(prompt.contains("복수"));
        assert!(prompt.contains("과거의 죄"));
    }

    #[test]
    fn user_prompt_ko_with_relationships() {
        let id_a = Uuid::new_v4();
        let id_b = Uuid::new_v4();
        let mut ctx = make_ctx(None);
        ctx.characters = vec![
            Character { id: id_a, project_id: Uuid::new_v4(), name: "A".into(), personality: None, appearance: None, secrets: None, motivation: None, profile_image_url: None, graph_x: None, graph_y: None, created_at: Utc::now(), updated_at: Utc::now() },
            Character { id: id_b, project_id: Uuid::new_v4(), name: "B".into(), personality: None, appearance: None, secrets: None, motivation: None, profile_image_url: None, graph_x: None, graph_y: None, created_at: Utc::now(), updated_at: Utc::now() },
        ];
        ctx.relationships = vec![
            CharacterRelationship { id: Uuid::new_v4(), project_id: Uuid::new_v4(), character_a_id: id_a, character_b_id: id_b, label: "라이벌".into(), visual_type: RelationshipVisual::Dashed, direction: RelationshipDirection::Bidirectional, created_at: Utc::now(), updated_at: Utc::now() },
        ];
        let prompt = PromptBuilder::user_prompt(&ctx, "ko");
        assert!(prompt.contains("A <-> B: 라이벌"));
    }

    #[test]
    fn user_prompt_ko_with_preceding_summaries() {
        let mut ctx = make_ctx(None);
        ctx.preceding_summaries = vec![
            SceneSummary { scene_id: Uuid::new_v4(), draft_version: 1, summary_text: "첫 번째 요약".into(), model: None, created_at: Utc::now(), updated_at: Utc::now() },
            SceneSummary { scene_id: Uuid::new_v4(), draft_version: 1, summary_text: "두 번째 요약".into(), model: None, created_at: Utc::now(), updated_at: Utc::now() },
        ];
        let prompt = PromptBuilder::user_prompt(&ctx, "ko");
        assert!(prompt.contains("1. 첫 번째 요약"));
        assert!(prompt.contains("2. 두 번째 요약"));
    }

    #[test]
    fn user_prompt_ko_with_simultaneous_scenes() {
        let mut ctx = make_ctx(None);
        ctx.simultaneous_scenes = vec![
            Scene {
                id: Uuid::new_v4(), track_id: Uuid::new_v4(), project_id: Uuid::new_v4(),
                start_position: 0.0, duration: 1.0, status: SceneStatus::Empty,
                title: "병렬 장면".into(), plot_summary: Some("다른 곳에서 벌어지는 일".into()),
                location: None, mood_tags: vec![], content: None, character_ids: vec![],
                created_at: Utc::now(), updated_at: Utc::now(),
            },
        ];
        let prompt = PromptBuilder::user_prompt(&ctx, "ko");
        assert!(prompt.contains("병렬 장면: 다른 곳에서 벌어지는 일"));
    }

    #[test]
    fn user_prompt_ko_with_next_scene() {
        let mut ctx = make_ctx(None);
        ctx.next_scene = Some(Scene {
            id: Uuid::new_v4(), track_id: Uuid::new_v4(), project_id: Uuid::new_v4(),
            start_position: 0.0, duration: 1.0, status: SceneStatus::Empty,
            title: "다음".into(), plot_summary: None,
            location: None, mood_tags: vec![], content: None, character_ids: vec![],
            created_at: Utc::now(), updated_at: Utc::now(),
        });
        let prompt = PromptBuilder::user_prompt(&ctx, "ko");
        assert!(prompt.contains("다음: (줄거리 없음)"));
    }

    // ---- user_prompt tests (English) ----

    #[test]
    fn user_prompt_en_contains_project_info() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::user_prompt(&ctx, "en");
        assert!(prompt.contains("테스트 소설"));
        assert!(prompt.contains("판타지"));
    }

    #[test]
    fn user_prompt_en_uses_english_labels() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::user_prompt(&ctx, "en");
        assert!(prompt.contains("## Story Settings"));
        assert!(prompt.contains("- Title:"));
        assert!(prompt.contains("- Genre:"));
    }

    #[test]
    fn user_prompt_en_final_instruction_in_english() {
        let ctx = make_ctx(None);
        let prompt = PromptBuilder::user_prompt(&ctx, "en");
        assert!(prompt.contains("Based on the context above"));
    }

    #[test]
    fn user_prompt_en_with_next_scene() {
        let mut ctx = make_ctx(None);
        ctx.next_scene = Some(Scene {
            id: Uuid::new_v4(), track_id: Uuid::new_v4(), project_id: Uuid::new_v4(),
            start_position: 0.0, duration: 1.0, status: SceneStatus::Empty,
            title: "Next".into(), plot_summary: None,
            location: None, mood_tags: vec![], content: None, character_ids: vec![],
            created_at: Utc::now(), updated_at: Utc::now(),
        });
        let prompt = PromptBuilder::user_prompt(&ctx, "en");
        assert!(prompt.contains("(no summary)"));
    }

    // ---- edit prompts (Korean) ----

    #[test]
    fn edit_system_prompt_ko_contains_editor_role() {
        let prompt = PromptBuilder::edit_system_prompt("ko");
        assert!(prompt.contains("편집 전문가"));
    }

    #[test]
    fn edit_user_prompt_ko_without_selection() {
        let prompt = PromptBuilder::edit_user_prompt("본문 내용", None, "더 긴장감 있게", "ko");
        assert!(prompt.contains("본문 내용"));
        assert!(prompt.contains("더 긴장감 있게"));
        assert!(!prompt.contains("선택된 텍스트"));
    }

    #[test]
    fn edit_user_prompt_ko_with_selection() {
        let prompt = PromptBuilder::edit_user_prompt("본문", Some("선택 부분"), "수정해줘", "ko");
        assert!(prompt.contains("선택 부분"));
        assert!(prompt.contains("수정해줘"));
    }

    // ---- edit prompts (English) ----

    #[test]
    fn edit_system_prompt_en_contains_editor_role() {
        let prompt = PromptBuilder::edit_system_prompt("en");
        assert!(prompt.contains("editing expert"));
    }

    #[test]
    fn edit_user_prompt_en_uses_english_labels() {
        let prompt = PromptBuilder::edit_user_prompt("content here", None, "make it tenser", "en");
        assert!(prompt.contains("## Current Text"));
        assert!(prompt.contains("## Edit Direction"));
    }

    #[test]
    fn edit_user_prompt_en_with_selection() {
        let prompt = PromptBuilder::edit_user_prompt("body", Some("selected"), "fix this", "en");
        assert!(prompt.contains("## Selected Text"));
        assert!(prompt.contains("selected"));
    }

    // ---- summary prompts (Korean) ----

    #[test]
    fn summary_system_prompt_ko_contains_role() {
        let prompt = PromptBuilder::summary_system_prompt("ko");
        assert!(prompt.contains("요약 전문가"));
    }

    #[test]
    fn summary_user_prompt_ko_contains_title_and_content() {
        let prompt = PromptBuilder::summary_user_prompt("1화", "긴 본문...", "ko");
        assert!(prompt.contains("1화"));
        assert!(prompt.contains("긴 본문..."));
        assert!(prompt.contains("2-3문장으로 요약"));
    }

    // ---- summary prompts (English) ----

    #[test]
    fn summary_system_prompt_en_contains_role() {
        let prompt = PromptBuilder::summary_system_prompt("en");
        assert!(prompt.contains("summary expert"));
    }

    #[test]
    fn summary_user_prompt_en_contains_title_and_content() {
        let prompt = PromptBuilder::summary_user_prompt("Ch.1", "Long text...", "en");
        assert!(prompt.contains("Ch.1"));
        assert!(prompt.contains("Long text..."));
        assert!(prompt.contains("2-3 sentences"));
    }

    // ---- structure prompts ----

    // ---- world phase prompts ----

    #[test]
    fn world_system_prompt_ko_contains_role() {
        let prompt = PromptBuilder::world_system_prompt("ko");
        assert!(prompt.contains("세계관"));
    }

    #[test]
    fn world_system_prompt_ko_instructs_korean() {
        let prompt = PromptBuilder::world_system_prompt("ko");
        assert!(prompt.contains("한국어"));
    }

    #[test]
    fn world_system_prompt_en_instructs_english() {
        let prompt = PromptBuilder::world_system_prompt("en");
        assert!(prompt.contains("English"));
    }

    #[test]
    fn world_system_prompt_has_schema_without_characters() {
        let prompt = PromptBuilder::world_system_prompt("ko");
        assert!(prompt.contains("title"));
        assert!(prompt.contains("genre"));
        assert!(!prompt.contains("characters"));
        assert!(!prompt.contains("tracks"));
    }

    #[test]
    fn world_user_prompt_contains_source() {
        let prompt = PromptBuilder::world_user_prompt("테스트 스토리", None);
        assert!(prompt.contains("테스트 스토리"));
    }

    #[test]
    fn world_user_prompt_with_clarifications() {
        let answers = vec!["답변1".to_string()];
        let prompt = PromptBuilder::world_user_prompt("텍스트", Some(&answers));
        assert!(prompt.contains("답변1"));
    }

    // ---- characters phase prompts ----

    #[test]
    fn characters_system_prompt_ko_contains_role() {
        let prompt = PromptBuilder::characters_system_prompt("ko");
        assert!(prompt.contains("등장인물"));
    }

    #[test]
    fn characters_system_prompt_has_schema_without_tracks() {
        let prompt = PromptBuilder::characters_system_prompt("ko");
        assert!(prompt.contains("characters"));
        assert!(prompt.contains("relationships"));
        assert!(!prompt.contains("tracks"));
        // Should NOT contain title/genre (that's Phase 1 World)
        assert!(!prompt.contains("\"title\""));
    }

    #[test]
    fn characters_user_prompt_contains_world_context() {
        let prompt = PromptBuilder::characters_user_prompt("스토리", "{\"title\": \"test\"}");
        assert!(prompt.contains("스토리"));
        assert!(prompt.contains("세계관"));
        assert!(prompt.contains("test"));
    }

    // ---- timeline phase prompts ----

    #[test]
    fn timeline_system_prompt_ko_contains_role() {
        let prompt = PromptBuilder::timeline_system_prompt("ko");
        assert!(prompt.contains("타임라인"));
    }

    #[test]
    fn timeline_system_prompt_has_tracks_schema() {
        let prompt = PromptBuilder::timeline_system_prompt("ko");
        assert!(prompt.contains("tracks"));
        assert!(prompt.contains("scenes"));
    }

    #[test]
    fn timeline_user_prompt_contains_both_contexts() {
        let prompt = PromptBuilder::timeline_user_prompt("스토리", "{\"title\":\"W\"}", "{\"characters\":[]}");
        assert!(prompt.contains("스토리"));
        assert!(prompt.contains("세계관"));
        assert!(prompt.contains("등장인물"));
    }

    // ---- structure prompts (legacy, kept for backward compat) ----

    #[test]
    fn structure_system_prompt_ko_contains_analyst_role() {
        let prompt = PromptBuilder::structure_system_prompt("ko");
        assert!(prompt.contains("구조 분석"));
    }

    #[test]
    fn structure_system_prompt_ko_contains_json_instruction() {
        let prompt = PromptBuilder::structure_system_prompt("ko");
        assert!(prompt.contains("JSON"));
    }

    #[test]
    fn structure_system_prompt_ko_contains_schema_fields() {
        let prompt = PromptBuilder::structure_system_prompt("ko");
        assert!(prompt.contains("title"));
        assert!(prompt.contains("characters"));
        assert!(prompt.contains("tracks"));
        assert!(prompt.contains("scenes"));
        assert!(prompt.contains("relationships"));
    }

    #[test]
    fn structure_system_prompt_ko_instructs_korean_output() {
        let prompt = PromptBuilder::structure_system_prompt("ko");
        assert!(prompt.contains("한국어"));
    }

    #[test]
    fn structure_system_prompt_en_instructs_english_output() {
        let prompt = PromptBuilder::structure_system_prompt("en");
        assert!(prompt.contains("English"));
    }

    #[test]
    fn structure_system_prompt_unknown_locale_defaults_to_english() {
        let prompt = PromptBuilder::structure_system_prompt("fr");
        assert!(prompt.contains("English"));
    }

    #[test]
    fn structure_user_prompt_contains_source_input() {
        let prompt = PromptBuilder::structure_user_prompt("나의 이야기 텍스트입니다", None);
        assert!(prompt.contains("나의 이야기 텍스트입니다"));
    }

    #[test]
    fn structure_user_prompt_without_clarifications() {
        let prompt = PromptBuilder::structure_user_prompt("텍스트", None);
        assert!(prompt.contains("텍스트"));
        // Should not contain clarification section
        assert!(!prompt.contains("추가 답변"));
    }

    #[test]
    fn structure_user_prompt_with_clarifications() {
        let answers = vec!["답변1".to_string(), "답변2".to_string()];
        let prompt = PromptBuilder::structure_user_prompt("텍스트", Some(&answers));
        assert!(prompt.contains("텍스트"));
        assert!(prompt.contains("답변1"));
        assert!(prompt.contains("답변2"));
    }
}
