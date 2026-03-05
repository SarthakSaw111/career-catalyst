import React, { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GripVertical,
  Save,
} from "lucide-react";
import { sendPromptJSON, isGeminiReady } from "../../services/gemini";
import LoadingDots from "./LoadingDots";

/*
  RoadmapEditor — Universal editor for any module's roadmap/topic tree.
  
  Supports two formats:
  1. DSA-style: [{ id, title, icon, concepts: [...] }]
  2. ML-style:  [{ id, title, icon, topics: [{ id, title, subtopics: [...] }] }]
  
  Props:
    - roadmap: array (the current roadmap)
    - onChange: (newRoadmap) => void
    - moduleTitle: string (for AI context)
    - format: "dsa" | "nested" (auto-detected if not provided)
    - onSave?: () => void (called after user clicks "Save Changes")
*/

function detectFormat(roadmap) {
  if (!roadmap?.length) return "nested";
  const first = roadmap[0];
  if (first.concepts && Array.isArray(first.concepts)) return "dsa";
  return "nested";
}

function InlineEdit({ value, onSave, className = "" }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  const save = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="input-field text-xs py-1 px-2 flex-1"
          autoFocus
        />
        <button
          onClick={save}
          className="p-1 text-brand-emerald hover:bg-brand-emerald/10 rounded"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            setText(value);
            setEditing(false);
          }}
          className="p-1 text-dark-300 hover:bg-dark-600 rounded"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:text-brand-indigo-light transition-colors ${className}`}
      title="Click to edit"
    >
      {value}
    </span>
  );
}

// AI generation prompt for adding topics
const AI_ADD_PROMPT = `You are a curriculum designer. Generate new learning content items based on the user's description.

Return JSON in this exact format:
{
  "items": [
    { "title": "Item title", "subtopics": ["sub1", "sub2", "sub3"] }
  ]
}

Generate 3-5 items. Each item should have 3-6 subtopics. Be practical and specific.`;

export default function RoadmapEditor({
  roadmap,
  onChange,
  moduleTitle,
  format: formatProp,
  onSave,
}) {
  const fmt = formatProp || detectFormat(roadmap);
  const [expandedSections, setExpandedSections] = useState({});
  const [aiInput, setAiInput] = useState("");
  const [sectionAiInputs, setSectionAiInputs] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState(null);
  const [aiError, setAiError] = useState(null);

  const toggleExpand = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Section-level operations ───
  const addSection = () => {
    const newId = `section-${Date.now()}`;
    const newSection =
      fmt === "dsa"
        ? {
            id: newId,
            title: "New Section",
            icon: "📌",
            difficulty: "medium",
            description: "",
            concepts: ["New Concept"],
          }
        : {
            id: newId,
            title: "New Section",
            icon: "📌",
            topics: [
              {
                id: `topic-${Date.now()}`,
                title: "New Topic",
                subtopics: ["Subtopic 1"],
              },
            ],
          };
    onChange([...roadmap, newSection]);
  };

  const removeSection = (idx) => {
    const updated = [...roadmap];
    updated.splice(idx, 1);
    onChange(updated);
  };

  const updateSection = (idx, key, value) => {
    const updated = [...roadmap];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

  // ─── DSA format: concept operations ───
  const addConcept = (sectionIdx) => {
    const updated = [...roadmap];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      concepts: [...(updated[sectionIdx].concepts || []), "New Concept"],
    };
    onChange(updated);
  };

  const removeConcept = (sectionIdx, conceptIdx) => {
    const updated = [...roadmap];
    const concepts = [...updated[sectionIdx].concepts];
    concepts.splice(conceptIdx, 1);
    updated[sectionIdx] = { ...updated[sectionIdx], concepts };
    onChange(updated);
  };

  const updateConcept = (sectionIdx, conceptIdx, value) => {
    const updated = [...roadmap];
    const concepts = [...updated[sectionIdx].concepts];
    concepts[conceptIdx] = value;
    updated[sectionIdx] = { ...updated[sectionIdx], concepts };
    onChange(updated);
  };

  // ─── Nested format: topic operations ───
  const addTopic = (sectionIdx) => {
    const updated = [...roadmap];
    const topics = [...(updated[sectionIdx].topics || [])];
    topics.push({
      id: `topic-${Date.now()}`,
      title: "New Topic",
      subtopics: ["Subtopic 1"],
    });
    updated[sectionIdx] = { ...updated[sectionIdx], topics };
    onChange(updated);
  };

  const removeTopic = (sectionIdx, topicIdx) => {
    const updated = [...roadmap];
    const topics = [...updated[sectionIdx].topics];
    topics.splice(topicIdx, 1);
    updated[sectionIdx] = { ...updated[sectionIdx], topics };
    onChange(updated);
  };

  const updateTopicTitle = (sectionIdx, topicIdx, title) => {
    const updated = [...roadmap];
    const topics = [...updated[sectionIdx].topics];
    topics[topicIdx] = { ...topics[topicIdx], title };
    updated[sectionIdx] = { ...updated[sectionIdx], topics };
    onChange(updated);
  };

  const addSubtopic = (sectionIdx, topicIdx) => {
    const updated = [...roadmap];
    const topics = [...updated[sectionIdx].topics];
    topics[topicIdx] = {
      ...topics[topicIdx],
      subtopics: [...(topics[topicIdx].subtopics || []), "New Subtopic"],
    };
    updated[sectionIdx] = { ...updated[sectionIdx], topics };
    onChange(updated);
  };

  const removeSubtopic = (sectionIdx, topicIdx, subIdx) => {
    const updated = [...roadmap];
    const topics = [...updated[sectionIdx].topics];
    const subtopics = [...topics[topicIdx].subtopics];
    subtopics.splice(subIdx, 1);
    topics[topicIdx] = { ...topics[topicIdx], subtopics };
    updated[sectionIdx] = { ...updated[sectionIdx], topics };
    onChange(updated);
  };

  const updateSubtopic = (sectionIdx, topicIdx, subIdx, value) => {
    const updated = [...roadmap];
    const topics = [...updated[sectionIdx].topics];
    const subtopics = [...topics[topicIdx].subtopics];
    subtopics[subIdx] = value;
    topics[topicIdx] = { ...topics[topicIdx], subtopics };
    updated[sectionIdx] = { ...updated[sectionIdx], topics };
    onChange(updated);
  };

  // ─── AI: Generate topics/concepts ───
  const handleAIGenerate = useCallback(
    async (sectionIdx) => {
      const input = sectionAiInputs[sectionIdx]?.trim();
      if (!input) return;
      if (!isGeminiReady()) {
        setAiError(
          "Gemini not initialized. Add your API key in Settings first.",
        );
        return;
      }
      setAiLoading(true);
      setAiTarget(sectionIdx);
      setAiError(null);
      try {
        const section = roadmap[sectionIdx];
        const result = await sendPromptJSON(
          AI_ADD_PROMPT,
          `Module: "${moduleTitle}". Section: "${section.title}".
User wants to add: "${input}".
Current ${fmt === "dsa" ? "concepts" : "topics"}: ${
            fmt === "dsa"
              ? (section.concepts || []).join(", ")
              : (section.topics || []).map((t) => t.title).join(", ")
          }
Generate new items that complement (don't duplicate) existing ones.`,
        );

        if (result?.items?.length) {
          const updated = [...roadmap];
          if (fmt === "dsa") {
            updated[sectionIdx] = {
              ...updated[sectionIdx],
              concepts: [
                ...(updated[sectionIdx].concepts || []),
                ...result.items.map((i) => i.title),
              ],
            };
          } else {
            updated[sectionIdx] = {
              ...updated[sectionIdx],
              topics: [
                ...(updated[sectionIdx].topics || []),
                ...result.items.map((i) => ({
                  id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  title: i.title,
                  subtopics: i.subtopics || [],
                })),
              ],
            };
          }
          onChange(updated);
        }
        setSectionAiInputs((prev) => ({ ...prev, [sectionIdx]: "" }));
      } catch (err) {
        console.error("AI generate error:", err);
        setAiError(err.message || "AI generation failed. Try again.");
      }
      setAiLoading(false);
      setAiTarget(null);
    },
    [sectionAiInputs, roadmap, onChange, moduleTitle, fmt],
  );

  // ─── AI: Generate entire new section ───
  const handleAIGenerateSection = useCallback(async () => {
    if (!aiInput.trim()) return;
    if (!isGeminiReady()) {
      setAiError("Gemini not initialized. Add your API key in Settings first.");
      return;
    }
    setAiLoading(true);
    setAiTarget("new-section");
    setAiError(null);
    try {
      const existingSections = roadmap.map((s) => s.title).join(", ");
      const result = await sendPromptJSON(
        `You are a curriculum designer for "${moduleTitle}".
Generate a NEW section based on the user's description.

Return JSON:
{
  "title": "Section Title",
  "icon": "emoji",
  "items": [
    { "title": "Topic 1", "subtopics": ["sub1", "sub2", "sub3"] }
  ]
}

Generate 3-6 items with 3-5 subtopics each. Be comprehensive and practical.`,
        `Existing sections: ${existingSections}.
User wants to add: "${aiInput}".
Generate a new section that complements existing content.`,
      );

      if (result?.title && result?.items) {
        const newSection =
          fmt === "dsa"
            ? {
                id: `section-${Date.now()}`,
                title: result.title,
                icon: result.icon || "📌",
                difficulty: "medium",
                description: "",
                concepts: result.items.map((i) => i.title),
              }
            : {
                id: `section-${Date.now()}`,
                title: result.title,
                icon: result.icon || "📌",
                topics: result.items.map((i) => ({
                  id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  title: i.title,
                  subtopics: i.subtopics || [],
                })),
              };
        onChange([...roadmap, newSection]);
      }
      setAiInput("");
    } catch (err) {
      console.error("AI section generate error:", err);
      setAiError(err.message || "AI section generation failed. Try again.");
    }
    setAiLoading(false);
    setAiTarget(null);
  }, [aiInput, roadmap, onChange, moduleTitle, fmt]);

  return (
    <div className="space-y-4">
      {/* AI Add Bar */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-brand-amber" />
          <span className="text-sm font-semibold text-white">
            AI-Assisted Editing
          </span>
        </div>
        <p className="text-xs text-dark-300 mb-2">
          Describe topics to add and AI will generate them for you. You can then
          edit inline.
        </p>
        <div className="flex gap-2">
          <input
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder='e.g., "Add graph algorithms" or "Add NLP section"'
            className="input-field text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAIGenerateSection()}
          />
          <button
            onClick={handleAIGenerateSection}
            disabled={aiLoading || !aiInput.trim()}
            className="btn-primary text-xs whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" /> Add Section
          </button>
        </div>
        {aiLoading && aiTarget === "new-section" && (
          <LoadingDots text="AI generating" />
        )}
        {aiError && (
          <div className="mt-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {aiError}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {roadmap.map((section, sIdx) => (
          <div key={section.id || sIdx} className="glass-card overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-600/30">
              <button
                onClick={() => toggleExpand(section.id)}
                className="text-dark-300 hover:text-white"
              >
                {expandedSections[section.id] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <span className="text-lg">{section.icon}</span>
              <InlineEdit
                value={section.title}
                onSave={(v) => updateSection(sIdx, "title", v)}
                className="text-sm font-semibold text-white flex-1"
              />
              <span className="text-[10px] text-dark-400">
                {fmt === "dsa"
                  ? `${(section.concepts || []).length} concepts`
                  : `${(section.topics || []).length} topics`}
              </span>
              <button
                onClick={() => removeSection(sIdx)}
                className="p-1 text-dark-400 hover:text-red-400 rounded transition-colors"
                title="Remove section"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expanded content */}
            {expandedSections[section.id] && (
              <div className="px-4 py-3 space-y-2 animate-fade-in">
                {/* DSA format: concepts list */}
                {fmt === "dsa" && (
                  <>
                    {(section.concepts || []).map((concept, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-2 group">
                        <div className="w-2 h-2 rounded-full bg-dark-500 flex-shrink-0" />
                        <InlineEdit
                          value={concept}
                          onSave={(v) => updateConcept(sIdx, cIdx, v)}
                          className="text-xs text-dark-200 flex-1"
                        />
                        <button
                          onClick={() => removeConcept(sIdx, cIdx)}
                          className="p-0.5 text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addConcept(sIdx)}
                      className="text-[11px] text-brand-indigo-light hover:text-brand-indigo flex items-center gap-1 mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add Concept
                    </button>
                  </>
                )}

                {/* Nested format: topics with subtopics */}
                {fmt === "nested" && (
                  <>
                    {(section.topics || []).map((topic, tIdx) => (
                      <div
                        key={topic.id || tIdx}
                        className="ml-2 border-l border-dark-600/30 pl-3"
                      >
                        <div className="flex items-center gap-2 group mb-1">
                          <InlineEdit
                            value={topic.title}
                            onSave={(v) => updateTopicTitle(sIdx, tIdx, v)}
                            className="text-xs font-medium text-dark-100 flex-1"
                          />
                          <button
                            onClick={() => removeTopic(sIdx, tIdx)}
                            className="p-0.5 text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-0.5 ml-3">
                          {(topic.subtopics || []).map((sub, subIdx) => (
                            <div
                              key={subIdx}
                              className="flex items-center gap-1.5 group/sub"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-dark-500 flex-shrink-0" />
                              <InlineEdit
                                value={sub}
                                onSave={(v) =>
                                  updateSubtopic(sIdx, tIdx, subIdx, v)
                                }
                                className="text-[11px] text-dark-300 flex-1"
                              />
                              <button
                                onClick={() =>
                                  removeSubtopic(sIdx, tIdx, subIdx)
                                }
                                className="p-0.5 text-dark-500 hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition-all"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addSubtopic(sIdx, tIdx)}
                            className="text-[10px] text-dark-400 hover:text-brand-indigo-light flex items-center gap-1 mt-0.5"
                          >
                            <Plus className="w-2.5 h-2.5" /> subtopic
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addTopic(sIdx)}
                      className="text-[11px] text-brand-indigo-light hover:text-brand-indigo flex items-center gap-1 mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add Topic
                    </button>
                  </>
                )}

                {/* AI add to this section */}
                <div className="flex gap-2 pt-2 border-t border-dark-600/20 mt-2">
                  <input
                    value={sectionAiInputs[sIdx] || ""}
                    onChange={(e) =>
                      setSectionAiInputs((prev) => ({
                        ...prev,
                        [sIdx]: e.target.value,
                      }))
                    }
                    placeholder={`AI: add ${fmt === "dsa" ? "concepts" : "topics"} to this section...`}
                    className="input-field text-[11px] py-1 flex-1"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAIGenerate(sIdx)
                    }
                  />
                  <button
                    onClick={() => handleAIGenerate(sIdx)}
                    disabled={aiLoading || !sectionAiInputs[sIdx]?.trim()}
                    className="px-2 py-1 rounded-lg bg-brand-amber/10 text-brand-amber text-[10px] hover:bg-brand-amber/20 transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" /> AI
                  </button>
                </div>
                {aiLoading && aiTarget === sIdx && (
                  <LoadingDots text="AI generating" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add section manually */}
      <div className="flex items-center gap-3">
        <button
          onClick={addSection}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Section Manually
        </button>
        {onSave && (
          <button
            onClick={onSave}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        )}
      </div>
    </div>
  );
}
