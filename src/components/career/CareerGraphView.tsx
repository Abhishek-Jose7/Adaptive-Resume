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
} from "lucide-react";
import { CareerGraphEdge, CareerGraphRelationType } from "@/types/bank";

interface GraphNode {
  id: string;
  type: "skill" | "project" | "experience" | "bullet" | "evidence";
  label: string;
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

  // Filter nodes based on search and type
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || n.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [nodes, searchQuery, filterType]);

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
      const res = await fetch("/api/v1/career-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, targetId, relationType }),
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
        return <Cpu className="w-4 h-4 text-amber-400" />;
      case "project":
        return <FolderGit2 className="w-4 h-4 text-purple-400" />;
      case "experience":
        return <Briefcase className="w-4 h-4 text-blue-400" />;
      case "bullet":
        return <Award className="w-4 h-4 text-emerald-400" />;
      case "evidence":
        return <FileCheck className="w-4 h-4 text-rose-400" />;
      default:
        return <Network className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNodeBg = (type: string, isSelected: boolean) => {
    if (isSelected) return "ring-2 ring-blue-500 bg-blue-950/80 border-blue-500";
    switch (type) {
      case "skill":
        return "bg-amber-950/40 border-amber-800/60 hover:border-amber-500 text-amber-200";
      case "project":
        return "bg-purple-950/40 border-purple-800/60 hover:border-purple-500 text-purple-200";
      case "experience":
        return "bg-blue-950/40 border-blue-800/60 hover:border-blue-500 text-blue-200";
      case "bullet":
        return "bg-emerald-950/40 border-emerald-800/60 hover:border-emerald-500 text-emerald-200";
      case "evidence":
        return "bg-rose-950/40 border-rose-800/60 hover:border-rose-500 text-rose-200";
      default:
        return "bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-200";
    }
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-2xl text-white">
      {/* Header Bar */}
      <div className="p-4 bg-gray-900/90 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Career Knowledge Graph
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                  PRD 18.3
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Explicit relationships between skills, projects, work experiences, and achievements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGraph}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 border border-gray-800 transition-colors"
            title="Refresh Graph"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsAddEdgeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Items
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="p-3 bg-gray-900/50 border-b border-gray-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-gray-500 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>
          {[
            { id: "all", label: `All (${nodes.length})` },
            { id: "skill", label: "Skills" },
            { id: "project", label: "Projects" },
            { id: "experience", label: "Experiences" },
            { id: "bullet", label: "Achievements" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterType === tab.id
                  ? "bg-gray-800 text-white border border-gray-700"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-48 sm:w-60">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Layout: Graph Nodes Grid & Detail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[460px]">
        {/* Node Explorer & Visual Connections */}
        <div className="lg:col-span-2 p-4 border-r border-gray-800 overflow-y-auto max-h-[580px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Building career topology from Data Bank...</p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Network className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-xs">No career graph nodes found matching your query.</p>
              <p className="text-[11px] text-gray-600 mt-1">
                Add skills, projects, and experiences in your Data Bank to populate the graph automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
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
                            <p className="text-xs font-semibold truncate text-white">
                              {node.label}
                            </p>
                            <p className="text-[10px] text-gray-400 capitalize">
                              {node.type}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900/80 border border-gray-800 text-gray-400 font-mono">
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
        <div className="p-4 bg-gray-950/60 flex flex-col justify-between max-h-[580px] overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getNodeIcon(selectedNode.type)}
                  <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
                    {selectedNode.type} Node
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white break-words">
                  {selectedNode.label}
                </h3>
                {selectedNode.metadata?.description && (
                  <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-900 border border-gray-800 rounded">
                    {selectedNode.metadata.description}
                  </p>
                )}
              </div>

              {/* Connected Relationships */}
              <div className="space-y-2 border-t border-gray-800 pt-3">
                <h4 className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span>Linked Connections</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {activeNodeEdges.length} total
                  </span>
                </h4>

                {activeNodeEdges.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic p-2 bg-gray-900/40 rounded border border-gray-800/60">
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
                          className="p-2 bg-gray-900/80 border border-gray-800 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              {otherNode && getNodeIcon(otherNode.type)}
                              <span className="font-medium text-white truncate text-[11px]">
                                {otherNode?.label || otherNodeId}
                              </span>
                            </div>
                            <span className="text-[10px] text-blue-400 font-mono">
                              {(edge.relationshipType || (edge as any).relationType || "").replace(/_/g, " ")}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteEdge(edge.id)}
                            className="p-1 text-gray-500 hover:text-rose-400 rounded transition-colors"
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
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4">
              <Network className="w-10 h-10 text-gray-700 mb-2" />
              <p className="text-xs font-semibold text-gray-400">No Node Selected</p>
              <p className="text-[11px] text-gray-600 mt-1">
                Click any node on the left to inspect its facts, verified skills, and explicit provenance links.
              </p>
            </div>
          )}

          {/* Bottom stats summary */}
          <div className="pt-4 border-t border-gray-800/80 mt-4 text-[10px] text-gray-500 flex justify-between items-center">
            <span>Career Graph v1.2</span>
            <span className="text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Truth Grounded
            </span>
          </div>
        </div>
      </div>

      {/* Add Connection Modal */}
      {isAddEdgeOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                Connect Career Graph Items
              </h3>
              <button
                onClick={() => setIsAddEdgeOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEdge} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Source Node</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-blue-500"
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
                <label className="block text-gray-400 mb-1 font-medium">Relationship Type</label>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as CareerGraphRelationType)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-blue-500"
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
                <label className="block text-gray-400 mb-1 font-medium">Target Node</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-blue-500"
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
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdge || !sourceId || !targetId}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow"
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
