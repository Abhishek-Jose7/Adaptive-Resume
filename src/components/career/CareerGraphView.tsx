"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Network,
  Cpu,
  FolderGit2,
  Briefcase,
  Award,
  FileCheck,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { CareerGraphEdge, CareerGraphRelationType } from "@/types/bank";
import { invalidateVaultCache } from "@/lib/cache/vaultClientCache";

interface GraphNode {
  id: string;
  type: "skill" | "project" | "experience" | "bullet" | "evidence";
  label: string;
  category?: string;
  group: string;
  metadata?: any;
  x?: number;
  y?: number;
}

export function CareerGraphView() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<CareerGraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isAddEdgeOpen, setIsAddEdgeOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState<CareerGraphRelationType>("used_skill");
  const [submittingEdge, setSubmittingEdge] = useState(false);
  const [autoCategorizing, setAutoCategorizing] = useState(false);
  const [autoCategorizeNotice, setAutoCategorizeNotice] = useState<string | null>(null);

  const fetchGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/career-graph");
      if (!res.ok) throw new Error("Failed to load Career Graph");
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (err: any) {
      setError(err.message || "Failed to load graph");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleAutoCategorize = async () => {
    setAutoCategorizing(true);
    setAutoCategorizeNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/v1/career-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_categorize" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to auto-categorize skills");
      }
      if (data.graph) {
        setNodes(data.graph.nodes || []);
        setEdges(data.graph.edges || []);
      } else {
        await fetchGraph();
      }
      invalidateVaultCache();
      const catCount = Number(data.categorizedCount || 0);
      const linkCount = Number(data.linkedCount || 0);
      if (catCount > 0 || linkCount > 0) {
        setAutoCategorizeNotice(
          `Auto-categorized ${catCount} unlinked skill${catCount === 1 ? "" : "s"} and established ${linkCount} new graph link${linkCount === 1 ? "" : "s"}.`
        );
      } else {
        setAutoCategorizeNotice("All skills are already categorized and linked.");
      }
    } catch (err: any) {
      setError(err?.message || "Could not auto-categorize skills");
    } finally {
      setAutoCategorizing(false);
    }
  };

  const edgeCountByNodeId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const edge of edges) {
      counts.set(edge.sourceId, (counts.get(edge.sourceId) || 0) + 1);
      counts.set(edge.targetId, (counts.get(edge.targetId) || 0) + 1);
    }
    return counts;
  }, [edges]);

  const unlinkedSkillsCount = useMemo(
    () =>
      nodes.filter((n) => n.type === "skill" && (edgeCountByNodeId.get(n.id) || 0) === 0).length,
    [nodes, edgeCountByNodeId]
  );

  // Filter nodes based on search and type
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesSearch =
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.category || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        filterType === "all"
          ? true
          : filterType === "unlinked_skills"
            ? n.type === "skill" && (edgeCountByNodeId.get(n.id) || 0) === 0
            : n.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [nodes, searchQuery, filterType, edgeCountByNodeId]);

  // Connected edges for the selected node
  const activeNodeEdges = useMemo(() => {
    if (!selectedNode) return [];
    return edges.filter(
      (e) => e.sourceId === selectedNode.id || e.targetId === selectedNode.id
    );
  }, [selectedNode, edges]);

  const handleCreateEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId) return;
    setSubmittingEdge(true);
    try {
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);
      const res = await fetch("/api/v1/career-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: sourceNode?.type || "bank_entry",
          sourceId,
          targetType: targetNode?.type || "bank_entry",
          targetId,
          relationshipType: relationType,
        }),
      });
      if (!res.ok) throw new Error("Failed to create connection");
      await fetchGraph();
      setIsAddEdgeOpen(false);
      setSourceId("");
      setTargetId("");
    } catch (err: any) {
      alert(err.message || "Error creating connection");
    } finally {
      setSubmittingEdge(false);
    }
  };

  const handleDeleteEdge = async (edgeId: string) => {
    if (!confirm("Remove this career link?")) return;
    try {
      const res = await fetch(`/api/v1/career-graph/edge/${edgeId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove link");
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    } catch (err: any) {
      alert(err.message || "Failed to delete link");
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "skill":
        return <Cpu className="w-4 h-4 text-marker-dark" />;
      case "project":
        return <FolderGit2 className="w-4 h-4 text-stamp" />;
      case "experience":
        return <Briefcase className="w-4 h-4 text-stamp" />;
      case "bullet":
        return <Award className="w-4 h-4 text-press" />;
      case "evidence":
        return <FileCheck className="w-4 h-4 text-alarm" />;
      default:
        return <Network className="w-4 h-4 text-graphite" />;
    }
  };

  const getNodeBg = (type: string, isSelected: boolean) => {
    if (isSelected) return "ring-2 ring-stamp bg-stamp-soft border-stamp";
    switch (type) {
      case "skill":
        return "bg-marker-soft border-marker/60 hover:border-marker text-marker-dark";
      case "project":
        return "bg-stamp-soft border-stamp/60 hover:border-stamp text-stamp";
      case "experience":
        return "bg-stamp-soft border-stamp/60 hover:border-stamp text-stamp";
      case "bullet":
        return "bg-press-soft border-press/60 hover:border-press text-press";
      case "evidence":
        return "bg-alarm-soft border-alarm/60 hover:border-alarm text-alarm";
      default:
        return "bg-sheet border-rule hover:border-rule text-ink";
    }
  };

  return (
    <div className="bg-paper border border-rule rounded-lg overflow-hidden shadow-plate text-ink">
      {/* Header Bar */}
      <div className="p-4 bg-sheet/90 border-b border-rule flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-stamp-soft border border-stamp/40 rounded-lg text-stamp">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
                Career Knowledge Graph
                <span className="text-[10px] normal-case font-semibold px-2 py-0.5 bg-stamp-soft text-stamp border border-stamp/30 rounded-full">
                  PRD 18.3
                </span>
              </h2>
              <p className="text-xs text-graphite">
                Explicit relationships between skills, projects, work experiences, and achievements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoCategorize}
            disabled={autoCategorizing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-paper border border-ink/25 hover:bg-paper-deep disabled:opacity-50 text-ink rounded-lg text-xs font-semibold transition-colors"
            title="Automatically group unlinked skills by domain and link them to matching projects and experiences"
          >
            <Sparkles className={`w-3.5 h-3.5 text-stamp ${autoCategorizing ? "animate-pulse" : ""}`} />
            {autoCategorizing
              ? "Categorizing…"
              : unlinkedSkillsCount > 0
                ? `Auto-categorize unlinked (${unlinkedSkillsCount})`
                : "Auto-categorize skills"}
          </button>
          <button
            onClick={fetchGraph}
            className="p-2 text-graphite hover:text-ink rounded-lg hover:bg-paper-deep border border-rule transition-colors"
            title="Refresh Graph"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsAddEdgeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stamp hover:bg-stamp-dark text-white rounded-lg text-xs font-semibold shadow-none transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Items
          </button>
        </div>
      </div>

      {autoCategorizeNotice && (
        <div className="px-4 py-2 bg-press-soft border-b border-press/20 text-press text-xs font-medium flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {autoCategorizeNotice}
          </span>
          <button
            type="button"
            onClick={() => setAutoCategorizeNotice(null)}
            className="text-[11px] font-bold hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control bar */}
      <div className="p-3 bg-sheet/50 border-b border-rule/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-graphite text-[11px] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>
          {[
            { id: "all", label: `All (${nodes.length})` },
            { id: "skill", label: "Skills" },
            { id: "unlinked_skills", label: `Unlinked (${unlinkedSkillsCount})` },
            { id: "project", label: "Projects" },
            { id: "experience", label: "Experiences" },
            { id: "bullet", label: "Achievements" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterType === tab.id
                  ? "bg-paper-deep text-ink border border-rule"
                  : "text-graphite hover:text-ink hover:bg-paper-deep/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-48 sm:w-60">
          <Search className="w-3.5 h-3.5 text-graphite absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sheet border border-rule rounded-lg pl-8 pr-3 py-1 text-xs text-ink placeholder-graphite focus:outline-none focus:border-stamp"
          />
        </div>
      </div>

      {/* Main Layout: Graph Nodes Grid & Detail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[460px]">
        {/* Node Explorer & Visual Connections */}
        <div className="lg:col-span-2 p-4 border-r border-rule overflow-y-auto max-h-[580px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-graphite space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-stamp" />
              <p className="text-xs">Building career topology from Data Bank...</p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="text-center py-20 text-graphite">
              <Network className="w-8 h-8 mx-auto mb-2 text-graphite" />
              <p className="text-xs">No career graph nodes found matching your query.</p>
              <p className="text-[11px] text-graphite mt-1">
                Add skills, projects, and experiences in your Data Bank to populate the graph automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] text-graphite px-1">
                <span>Select a node to inspect verified evidence & connections:</span>
                <span>{edges.length} explicit links established</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const edgeCount = edges.filter(
                    (e) => e.sourceId === node.id || e.targetId === node.id
                  ).length;

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${getNodeBg(
                        node.type,
                        isSelected
                      )}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 overflow-hidden">
                          <div className="mt-0.5">{getNodeIcon(node.type)}</div>
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate text-ink">
                              {node.label}
                            </p>
                            <p className="text-[10px] text-graphite capitalize">
                              {node.type === "skill" && node.category && node.category !== "skill"
                                ? `Skill · ${node.category}`
                                : node.type}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sheet/80 border border-rule text-graphite font-mono">
                          {edgeCount} {edgeCount === 1 ? "link" : "links"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected Node Inspector Sidebar */}
        <div className="p-4 bg-paper/60 flex flex-col justify-between max-h-[580px] overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getNodeIcon(selectedNode.type)}
                  <span className="text-[11px] font-mono normal-case tracking-normal text-graphite">
                    {selectedNode.type} Node
                  </span>
                </div>
                <h3 className="text-sm font-bold text-ink break-words">
                  {selectedNode.label}
                </h3>
                {selectedNode.metadata?.description && (
                  <p className="text-xs text-graphite mt-2 p-2 bg-sheet border border-rule rounded">
                    {selectedNode.metadata.description}
                  </p>
                )}
              </div>

              {/* Connected Relationships */}
              <div className="space-y-2 border-t border-rule pt-3">
                <h4 className="text-xs font-semibold text-ink flex items-center justify-between">
                  <span>Linked Connections</span>
                  <span className="text-[10px] text-graphite font-mono">
                    {activeNodeEdges.length} total
                  </span>
                </h4>

                {activeNodeEdges.length === 0 ? (
                  <p className="text-[11px] text-graphite italic p-2 bg-sheet/40 rounded border border-rule/60">
                    No explicit connections established yet. Click &ldquo;Connect Items&rdquo; to associate this {selectedNode.type} with supporting evidence or projects.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {activeNodeEdges.map((edge) => {
                      const isSource = edge.sourceId === selectedNode.id;
                      const otherNodeId = isSource ? edge.targetId : edge.sourceId;
                      const otherNode = nodes.find((n) => n.id === otherNodeId);

                      return (
                        <div
                          key={edge.id}
                          className="p-2 bg-sheet/80 border border-rule rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              {otherNode && getNodeIcon(otherNode.type)}
                              <span className="font-medium text-ink truncate text-[11px]">
                                {otherNode?.label || otherNodeId}
                              </span>
                            </div>
                            <span className="text-[10px] text-stamp font-mono">
                              {(edge.relationshipType || (edge as any).relationType || "").replace(/_/g, " ")}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteEdge(edge.id)}
                            className="p-1 text-graphite hover:text-alarm rounded transition-colors"
                            title="Remove relation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-graphite p-4">
              <Network className="w-10 h-10 text-ink mb-2" />
              <p className="text-xs font-semibold text-graphite">No Node Selected</p>
              <p className="text-[11px] text-graphite mt-1">
                Click any node on the left to inspect its facts, verified skills, and explicit provenance links.
              </p>
            </div>
          )}

          {/* Bottom stats summary */}
          <div className="pt-4 border-t border-rule/80 mt-4 text-[10px] text-graphite flex justify-between items-center">
            <span>Career Graph v1.2</span>
            <span className="text-press flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Truth Grounded
            </span>
          </div>
        </div>
      </div>

      {/* Add Connection Modal */}
      {isAddEdgeOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-sheet border border-rule rounded-lg max-w-md w-full p-5 space-y-4 shadow-plate">
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Plus className="w-4 h-4 text-stamp" />
                Connect Career Graph Items
              </h3>
              <button
                onClick={() => setIsAddEdgeOpen(false)}
                className="text-graphite hover:text-ink text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEdge} className="space-y-3 text-xs">
              <div>
                <label className="block text-graphite mb-1 font-medium">Source Node</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs focus:outline-none focus:border-stamp"
                  required
                >
                  <option value="">Select source item...</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.type.toUpperCase()}] {n.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-graphite mb-1 font-medium">Relationship Type</label>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as CareerGraphRelationType)}
                  className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs focus:outline-none focus:border-stamp"
                >
                  <option value="skill_used_in_project">Skill used in Project</option>
                  <option value="skill_used_in_experience">Skill used in Experience</option>
                  <option value="achievement_in_project">Achievement in Project</option>
                  <option value="achievement_in_experience">Achievement in Experience</option>
                  <option value="evidence_supports_bullet">Evidence supports Achievement</option>
                  <option value="subskill_of">Subskill of</option>
                </select>
              </div>

              <div>
                <label className="block text-graphite mb-1 font-medium">Target Node</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-lg p-2 text-ink text-xs focus:outline-none focus:border-stamp"
                  required
                >
                  <option value="">Select target item...</option>
                  {nodes
                    .filter((n) => n.id !== sourceId)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        [{n.type.toUpperCase()}] {n.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEdgeOpen(false)}
                  className="px-3 py-1.5 bg-paper-deep text-ink hover:bg-paper-deep rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdge || !sourceId || !targetId}
                  className="px-3.5 py-1.5 bg-stamp hover:bg-stamp-dark disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow"
                >
                  {submittingEdge ? "Linking..." : "Establish Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
