use super::models::GenerationContext;

/// Builds LLM prompts from a `GenerationContext` for Korean web novel scene generation.
pub struct PromptBuilder;

impl PromptBuilder {
    /// Build a system prompt for scene generation.
    pub fn system_prompt(ctx: &GenerationContext) -> String {
        let mut parts: Vec<String> = Vec::new();

        parts.push(
            "당신은 한국 웹소설 전문 작가입니다. \
             주어진 컨텍스트(장르, 톤, 시점, 캐릭터 정보, 이전 줄거리 요약)를 바탕으로 \
             지정된 장면의 본문을 작성합니다."
                .to_string(),
        );

        parts.push("\n\n## 작성 규칙".to_string());
        parts.push("- 한국어로 작성하되, 고유명사나 외래어는 원어 그대로 사용 가능".to_string());
        parts.push("- 묘사와 대화를 균형 있게 배치".to_string());
        parts.push("- 장면의 분위기(mood_tags)에 맞는 문체 사용".to_string());
        parts.push("- 캐릭터의 성격, 동기, 비밀을 반영한 행동과 대사".to_string());
        parts.push("- 이전 장면과의 연속성 유지".to_string());
        parts.push("- 동시 진행 장면이 있다면 시간적 정합성 유지".to_string());

        // POV instruction.
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

    /// Build a user prompt for scene generation.
    pub fn user_prompt(ctx: &GenerationContext) -> String {
        let mut parts: Vec<String> = Vec::new();

        // Project config.
        parts.push("## 작품 설정".to_string());
        parts.push(format!("- 제목: {}", ctx.project.title));
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

        // Characters.
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

        // Relationships.
        if !ctx.relationships.is_empty() {
            parts.push("\n## 인물 관계".to_string());
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

        // Preceding summaries.
        if !ctx.preceding_summaries.is_empty() {
            parts.push("\n## 이전 장면 요약 (시간순)".to_string());
            for (i, summary) in ctx.preceding_summaries.iter().enumerate() {
                parts.push(format!("{}. {}", i + 1, summary.summary_text));
            }
        }

        // Simultaneous scenes.
        if !ctx.simultaneous_scenes.is_empty() {
            parts.push("\n## 동시 진행 장면".to_string());
            for scene in &ctx.simultaneous_scenes {
                let summary = scene
                    .plot_summary
                    .as_deref()
                    .unwrap_or("(줄거리 없음)");
                parts.push(format!("- {}: {}", scene.title, summary));
            }
        }

        // Next scene hint.
        if let Some(ref next) = ctx.next_scene {
            parts.push("\n## 다음 장면 (참고)".to_string());
            let summary = next.plot_summary.as_deref().unwrap_or("(줄거리 없음)");
            parts.push(format!("- {}: {}", next.title, summary));
        }

        // Current scene.
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

    /// Build prompts for direction-based editing.
    pub fn edit_system_prompt() -> String {
        "당신은 한국 웹소설 편집 전문가입니다. \
         사용자의 편집 지시에 따라 기존 본문을 수정합니다.\n\n\
         ## 규칙\n\
         - 지시된 부분만 수정하고, 나머지는 최대한 유지\n\
         - 문체와 톤의 일관성 유지\n\
         - 수정된 전체 본문을 출력 (변경된 부분만이 아닌 전체)\n\
         - 마크다운 없이 순수 텍스트"
            .to_string()
    }

    /// Build a user prompt for direction-based editing.
    pub fn edit_user_prompt(
        content: &str,
        selected_text: Option<&str>,
        direction: &str,
    ) -> String {
        let mut parts: Vec<String> = Vec::new();

        parts.push("## 현재 본문".to_string());
        parts.push(content.to_string());

        if let Some(selected) = selected_text {
            parts.push(format!("\n## 선택된 텍스트\n{selected}"));
        }

        parts.push(format!("\n## 편집 지시\n{direction}"));
        parts.push(
            "\n위 지시에 따라 수정된 전체 본문을 작성해주세요.".to_string(),
        );

        parts.join("\n")
    }

    /// Build prompts for scene summary generation.
    pub fn summary_system_prompt() -> String {
        "당신은 소설 장면 요약 전문가입니다. \
         주어진 장면 본문을 2-3문장으로 압축 요약합니다.\n\n\
         ## 규칙\n\
         - 핵심 사건과 인물 행동 중심으로 요약\n\
         - 감정적 변화나 관계 변화 포함\n\
         - 다음 장면 작성에 필요한 맥락 정보 보존\n\
         - 한국어로 작성"
            .to_string()
    }

    /// Build a user prompt for scene summary generation.
    pub fn summary_user_prompt(scene_title: &str, content: &str) -> String {
        format!(
            "## 장면: {scene_title}\n\n\
             {content}\n\n\
             위 장면을 2-3문장으로 요약해주세요."
        )
    }
}
