import React, { useEffect, useState } from 'react';
import { templateService } from '../../services/api';
import { TemplateRecord } from '../../types';
import { FileText, Save, Check, Layers, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templateService.list();
      setTemplates(data);
      if (data.length > 0) setSelectedTemplate(data[0]);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await templateService.update(selectedTemplate.id, selectedTemplate);
      setSuccessMsg('Template blueprint saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadTemplates();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-mira-muted">Loading templates...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-mira-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-mira-dark">Institutional Template Management</h1>
          <p className="text-xs text-mira-muted">Configure standardized document blueprints and drafting prompt guidelines.</p>
        </div>

        {selectedTemplate && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Blueprint Changes'}
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Template Selector */}
        <div className="md:col-span-4 bg-white p-4 rounded-xl border border-mira-border shadow-xs space-y-3">
          <span className="text-xs font-bold text-mira-dark uppercase tracking-wider">Available Templates</span>
          <div className="space-y-2">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedTemplate?.id === tmpl.id
                    ? 'border-mira-primary bg-mira-light/50'
                    : 'border-mira-border hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mira-dark">{tmpl.name}</span>
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                    {tmpl.documentType?.code}
                  </span>
                </div>
                <p className="text-[11px] text-mira-muted mt-1">{tmpl.description}</p>
                <span className="inline-block mt-2 text-[10px] text-mira-primary font-semibold">
                  {tmpl.sections.length} Standard Sections (v{tmpl.version})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section Editor */}
        <div className="md:col-span-8 bg-white p-6 rounded-xl border border-mira-border shadow-xs space-y-4">
          {selectedTemplate ? (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-mira-dark">{selectedTemplate.name}</h3>
                <p className="text-xs text-mira-muted">{selectedTemplate.description}</p>
              </div>

              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                {selectedTemplate.sections.map((sec, idx) => (
                  <div key={sec.id} className="p-3.5 bg-gray-50/70 rounded-xl border border-mira-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-mira-dark flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        {sec.title}
                      </span>
                      <span className="text-[10px] text-mira-muted uppercase font-mono">Key: {sec.sectionKey}</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-mira-muted uppercase">Prompt Guidance Rule</label>
                      <input
                        type="text"
                        value={sec.defaultPromptGuide}
                        onChange={(e) => {
                          const updatedSections = [...selectedTemplate.sections];
                          updatedSections[idx].defaultPromptGuide = e.target.value;
                          setSelectedTemplate({ ...selectedTemplate, sections: updatedSections });
                        }}
                        className="w-full mt-1 p-2 bg-white border border-mira-border rounded-md text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-mira-muted">Select a template to configure sections.</div>
          )}
        </div>
      </div>
    </div>
  );
};
