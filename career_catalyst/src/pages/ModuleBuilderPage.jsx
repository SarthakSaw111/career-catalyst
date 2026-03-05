import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Check,
  RefreshCw,
  ArrowLeft,
  GripVertical,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { sendPromptJSON, sendPrompt } from "../services/gemini";
import MarkdownRenderer from "../components/shared/MarkdownRenderer";
import LoadingDots from "../components/shared/LoadingDots";
import GenerationConfigBar from "../components/shared/GenerationConfigBar";

const MODULE_PROMPT = `You are an expert curriculum designer and learning architect.
The user wants to create a comprehensive learning module. Based on their description, generate a complete structured roadmap.

Return JSON with this EXACT structure:
{
  "title": "Module Title",
  "description": "One-line description of what this module covers",
  "icon_suggestion": "emoji icon for this module",
  "sections": [
    {
      "id": "section-slug",
      "title": "Section Title",
      "icon": "emoji",
      "topics": [
        {
          "id": "topic-slug",
          "title": "Topic Title",
          "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"]
        }
      ]
    }
  ]
}

Rules:
- Create 4-8 sections covering the full breadth of the subject
- Each section should have 2-5 topics
- Each topic should have 3-6 subtopics (these are the actual learnable units)
- Progress from fundamentals to advanced
- Include practical/hands-on topics, not just theory
- If the topic is technical, include interview-relevant sections
- Make subtopics specific and actionable (not vague like "learn basics")
- Tailor to the user's context: AI/ML engineer, preparing for top company interviews`;

export default function ModuleBuilderPage() {
  const {
    geminiReady,
    addCustomModule,
    customModules,
    deleteCustomModule,
    updateCustomModule,
  } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState("list"); // list, create, edit
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedModule, setGeneratedModule] = useState(null);
  const [editingModule, setEditingModule] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [saving, setSaving] = useState(false);

  // ─── AI generates module structure ───
  const handleGenerate = useCallback(async () => {
    if (!geminiReady || !description.trim()) return;
    setGenerating(true);
    setGeneratedModule(null);
    try {
      const result = await sendPromptJSON(
        MODULE_PROMPT,
        `Create a comprehensive learning module for: "${description.trim()}"
        
I'm Sarthak Saw, AI/ML Engineer with 1.5 years experience at a startup.
I work with LLMs, RAG pipelines, multi-agent systems, Python, C++, JavaScript.
I want DEEP knowledge, not surface-level content.
Make it comprehensive enough to crack interviews at Google or any top company.`,
      );
      setGeneratedModule(result);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
    setGenerating(false);
  }, [geminiReady, description]);

  // ─── Save module ───
  const handleSave = useCallback(async () => {
    if (!generatedModule) return;
    setSaving(true);
    const slug = generatedModule.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const moduleData = {
      slug,
      title: generatedModule.title,
      description: generatedModule.description,
      icon: generatedModule.icon_suggestion || "📘",
      color: "brand-indigo",
      module_type: "learn",
      roadmap: generatedModule.sections,
    };

    const saved = await addCustomModule(moduleData);
    setSaving(false);
    if (saved) {
      setMode("list");
      setGeneratedModule(null);
      setDescription("");
    }
  }, [generatedModule, addCustomModule]);

  // ─── Edit inline ───
  const handleAddTopic = (sectionIdx) => {
    const updated = { ...generatedModule };
    updated.sections[sectionIdx].topics.push({
      id: `new-topic-${Date.now()}`,
      title: "New Topic",
      subtopics: ["New Subtopic"],
    });
    setGeneratedModule({ ...updated });
  };

  const handleAddSection = () => {
    const updated = { ...generatedModule };
    updated.sections.push({
      id: `new-section-${Date.now()}`,
      title: "New Section",
      icon: "📌",
      topics: [
        {
          id: `new-topic-${Date.now()}`,
          title: "New Topic",
          subtopics: ["New Subtopic"],
        },
      ],
    });
    setGeneratedModule({ ...updated });
  };

  const handleRemoveSection = (idx) => {
    const updated = { ...generatedModule };
    updated.sections.splice(idx, 1);
    setGeneratedModule({ ...updated });
  };

  const handleRemoveTopic = (sectionIdx, topicIdx) => {
    const updated = { ...generatedModule };
    updated.sections[sectionIdx].topics.splice(topicIdx, 1);
    setGeneratedModule({ ...updated });
  };

  const handleEditSectionTitle = (idx, title) => {
    const updated = { ...generatedModule };
    updated.sections[idx].title = title;
    setGeneratedModule({ ...updated });
  };

  const handleEditTopicTitle = (sectionIdx, topicIdx, title) => {
    const updated = { ...generatedModule };
    updated.sections[sectionIdx].topics[topicIdx].title = title;
    setGeneratedModule({ ...updated });
  };

  const handleAddSubtopic = (sectionIdx, topicIdx, subtopic) => {
    const updated = { ...generatedModule };
    updated.sections[sectionIdx].topics[topicIdx].subtopics.push(subtopic);
    setGeneratedModule({ ...updated });
  };

  const handleRemoveSubtopic = (sectionIdx, topicIdx, subIdx) => {
    const updated = { ...generatedModule };
    updated.sections[sectionIdx].topics[topicIdx].subtopics.splice(subIdx, 1);
    setGeneratedModule({ ...updated });
  };

  const toggleSection = (idx) => {
    setExpandedSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ─── LIST VIEW ───
  if (mode === "list") {
    return (
      <div className="page-container max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Learning Modules
            </h1>
            <p className="text-dark-200">
              Create custom learning paths powered by AI. Learn anything you
              want, deeply.
            </p>
          </div>
          <button
            onClick={() => setMode("create")}
            className="btn-primary flex items-center gap-2"
            disabled={!geminiReady}
          >
            <Plus className="w-4 h-4" /> Create Module
          </button>
        </div>

        {/* Custom modules */}
        {customModules.length > 0 && (
          <div className="space-y-3 mb-8">
            <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wider">
              Your Modules
            </h2>
            {customModules.map((mod) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 flex items-center gap-4 group"
              >
                <span className="text-2xl">{mod.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-dark-300 truncate">
                    {mod.description}
                  </p>
                  <p className="text-[10px] text-dark-400 mt-1">
                    {mod.roadmap?.length || 0} sections ·{" "}
                    {mod.roadmap?.reduce(
                      (a, s) => a + (s.topics?.length || 0),
                      0,
                    ) || 0}{" "}
                    topics
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/module/${mod.slug}`)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    <BookOpen className="w-3 h-3 mr-1 inline" /> Open
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${mod.title}"?`)) {
                        deleteCustomModule(mod.id);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {customModules.length === 0 && (
          <div className="glass-card p-16 text-center">
            <Sparkles className="w-14 h-14 text-dark-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No custom modules yet
            </h3>
            <p className="text-sm text-dark-200 mb-6 max-w-md mx-auto">
              Describe what you want to learn and AI will create a structured
              module with sections, topics, and subtopics — just like the
              built-in DSA, ML, and System Design modules.
            </p>
            <button
              onClick={() => setMode("create")}
              className="btn-primary inline-flex items-center gap-2"
              disabled={!geminiReady}
            >
              <Sparkles className="w-4 h-4" /> Create Your First Module
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── CREATE VIEW ───
  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            setMode("list");
            setGeneratedModule(null);
            setDescription("");
          }}
          className="p-2 rounded-lg hover:bg-dark-700 text-dark-200 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Create Learning Module
          </h1>
          <p className="text-sm text-dark-200">
            Describe what you want to learn. AI will design the full curriculum.
          </p>
        </div>
      </div>

      {/* Config bar */}
      <div className="mb-4">
        <GenerationConfigBar compact />
      </div>

      {/* Input */}
      {!generatedModule && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              What do you want to learn?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 'Kubernetes and cloud-native architecture — from basics to production deployment, including Helm, service mesh, observability, and interview prep for DevOps/SRE roles at top companies'

or: 'Advanced TypeScript patterns for large-scale apps'
or: 'Rust systems programming from scratch to building a database'
or: 'Quantitative finance and algorithmic trading with Python'"
              className="textarea-field min-h-[150px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating || !description.trim() || !geminiReady}
              className="btn-primary flex items-center gap-2"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? "Generating..." : "Generate Module Structure"}
            </button>
            {!geminiReady && (
              <p className="text-xs text-brand-amber">
                Add your Gemini API key in Settings first.
              </p>
            )}
          </div>
          {generating && <LoadingDots text="AI is designing your curriculum" />}
        </div>
      )}

      {/* Generated module preview + edit */}
      {generatedModule && (
        <div className="space-y-4 animate-fade-in">
          {/* Header */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">
                {generatedModule.icon_suggestion || "📘"}
              </span>
              <div className="flex-1">
                <input
                  type="text"
                  value={generatedModule.title}
                  onChange={(e) =>
                    setGeneratedModule((g) => ({ ...g, title: e.target.value }))
                  }
                  className="bg-transparent text-xl font-bold text-white border-b border-transparent hover:border-dark-500 focus:border-brand-indigo focus:outline-none w-full transition-all"
                />
                <input
                  type="text"
                  value={generatedModule.description}
                  onChange={(e) =>
                    setGeneratedModule((g) => ({
                      ...g,
                      description: e.target.value,
                    }))
                  }
                  className="bg-transparent text-sm text-dark-200 border-b border-transparent hover:border-dark-500 focus:border-brand-indigo focus:outline-none w-full mt-1 transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-dark-300">
              {generatedModule.sections?.length || 0} sections ·{" "}
              {generatedModule.sections?.reduce(
                (a, s) => a + (s.topics?.length || 0),
                0,
              ) || 0}{" "}
              topics ·{" "}
              {generatedModule.sections?.reduce(
                (a, s) =>
                  a +
                  s.topics?.reduce((b, t) => b + (t.subtopics?.length || 0), 0),
                0,
              ) || 0}{" "}
              subtopics
            </p>
            <p className="text-[11px] text-dark-400 mt-1">
              ✏️ Click any title/text to edit inline. Use buttons to add/remove
              sections and topics.
            </p>
          </div>

          {/* Sections */}
          {generatedModule.sections?.map((section, sIdx) => (
            <div key={sIdx} className="glass-card overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-dark-800/40">
                <button
                  onClick={() => toggleSection(sIdx)}
                  className="text-dark-300 hover:text-white"
                >
                  {expandedSections[sIdx] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <span className="text-lg">{section.icon}</span>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => handleEditSectionTitle(sIdx, e.target.value)}
                  className="bg-transparent text-sm font-bold text-white flex-1 border-b border-transparent hover:border-dark-500 focus:border-brand-indigo focus:outline-none transition-all"
                />
                <span className="text-[10px] text-dark-400">
                  {section.topics?.length || 0} topics
                </span>
                <button
                  onClick={() => handleRemoveSection(sIdx)}
                  className="p-1 rounded hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Topics (expanded) */}
              {expandedSections[sIdx] && (
                <div className="px-5 pb-4 pt-2 space-y-3">
                  {section.topics?.map((topic, tIdx) => (
                    <div key={tIdx} className="bg-dark-800/40 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={topic.title}
                          onChange={(e) =>
                            handleEditTopicTitle(sIdx, tIdx, e.target.value)
                          }
                          className="bg-transparent text-sm font-medium text-white flex-1 border-b border-transparent hover:border-dark-500 focus:border-brand-indigo focus:outline-none transition-all"
                        />
                        <button
                          onClick={() => handleRemoveTopic(sIdx, tIdx)}
                          className="p-1 rounded hover:bg-red-500/10 text-dark-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {topic.subtopics?.map((sub, subIdx) => (
                          <span
                            key={subIdx}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-dark-700 text-[11px] text-dark-200 group/sub"
                          >
                            {sub}
                            <button
                              onClick={() =>
                                handleRemoveSubtopic(sIdx, tIdx, subIdx)
                              }
                              className="opacity-0 group-hover/sub:opacity-100 text-red-400 hover:text-red-300 transition-all ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            const name = prompt("Subtopic name:");
                            if (name) handleAddSubtopic(sIdx, tIdx, name);
                          }}
                          className="px-2 py-1 rounded-lg border border-dashed border-dark-500 text-[11px] text-dark-400 hover:border-brand-indigo hover:text-brand-indigo-light transition-all"
                        >
                          + add
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddTopic(sIdx)}
                    className="w-full py-2 rounded-lg border border-dashed border-dark-500 text-xs text-dark-400 hover:border-brand-indigo hover:text-brand-indigo-light transition-all"
                  >
                    + Add Topic
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add section */}
          <button
            onClick={handleAddSection}
            className="w-full py-3 rounded-xl border border-dashed border-dark-500 text-sm text-dark-400 hover:border-brand-indigo hover:text-brand-indigo-light transition-all"
          >
            + Add Section
          </button>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-success flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save Module"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Regenerate
            </button>
            <button
              onClick={() => {
                setGeneratedModule(null);
              }}
              className="btn-ghost"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
