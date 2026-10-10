import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import caseService from '../../../services/caseService';
import documentService from '../../../services/documentService';
import CaseOverviewCard from './components/CaseOverviewCard';
import CaseCompletenessCard from './components/CaseCompletenessCard';
import CaseSymptomsCard from './components/CaseSymptomsCard';
import CaseMedicalBackgroundCard from './components/CaseMedicalBackgroundCard';
import CaseFindingsCard from './components/CaseFindingsCard';
import CaseDiscrepanciesCard from './components/CaseDiscrepanciesCard';
import CaseMissingInfoCard from './components/CaseMissingInfoCard';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import EditCaseModal from './components/EditCaseModal';
import './CaseReviewPage.css';

export default function CaseReviewPage({ role = 'patient' }) {
  const { caseId, conversationId } = useParams();
  const { user } = useAuth();
  const userRole = user?.role || (role === 'professional' ? 'PROFESSIONAL' : 'PATIENT');

  // Core Case Data States
  const [caseData, setCaseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCaseNotCreated, setIsCaseNotCreated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Status & Edit State
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Document Inspection State
  const [selectedDocData, setSelectedDocData] = useState(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [docError, setDocError] = useState(null);
  const [conversationDocs, setConversationDocs] = useState([]);

  // Fetch Case Data
  const loadCase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsCaseNotCreated(false);

      let res;
      if (caseId) {
        res = await caseService.getCaseById(caseId);
      } else if (conversationId) {
        res = await caseService.getCaseByConversation(conversationId);
      } else {
        throw new Error('No Case ID or Conversation ID provided in route');
      }

      if (res?.success && res.case) {
        setCaseData(res.case);

        // Also fetch conversation documents for file inspection/naming
        const convId = res.case.conversationId;
        if (convId) {
          documentService.getDocuments(convId)
            .then((docRes) => {
              if (docRes?.success && Array.isArray(docRes.documents)) {
                setConversationDocs(docRes.documents);
              }
            })
            .catch(() => {});
        }
      } else {
        throw new Error('Case document was not returned by server');
      }
    } catch (err) {
      if (err.status === 404 && conversationId && !caseId) {
        setIsCaseNotCreated(true);
      } else if (err.status === 403 || err.status === 404) {
        setError('You do not have authorization to view this medical case.');
      } else {
        setError(err.message || 'Unable to load structured medical case.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [caseId, conversationId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Handle Case Initialization from Consultation
  const handleInitializeCase = async () => {
    if (!conversationId) return;
    try {
      setIsInitializing(true);
      setError(null);
      const initRes = await caseService.createOrInitCase(conversationId);
      if (initRes?.success && initRes.case) {
        setCaseData(initRes.case);
        setIsCaseNotCreated(false);
        setNotification({
          type: 'success',
          message: 'Medical case initialized successfully. Extracting clinical facts...',
        });

        // Trigger clinical facts extraction in background
        caseService.extractFromConversation(conversationId)
          .then((extractRes) => {
            if (extractRes?.success && extractRes.case) {
              setCaseData(extractRes.case);
              setNotification({
                type: 'success',
                message: 'Clinical findings extracted from consultation messages.',
              });
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize case for this consultation.');
    } finally {
      setIsInitializing(false);
    }
  };

  // Status Change Handler
  const handleStatusChange = async (newStatus) => {
    if (!caseData?.id && !caseData?._id) return;
    const targetId = caseData.id || caseData._id;

    try {
      setIsStatusUpdating(true);
      const res = await caseService.updateCaseStatus(targetId, newStatus);
      if (res?.success && res.case) {
        setCaseData(res.case);
        setNotification({
          type: 'success',
          message: `Case status successfully updated to "${newStatus.replace(/_/g, ' ')}".`,
        });
      }
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Save Edit Handler
  const handleSaveEdit = async (updatePayload) => {
    if (!caseData?.id && !caseData?._id) return;
    const targetId = caseData.id || caseData._id;

    try {
      setIsSavingEdit(true);
      setEditError(null);
      const res = await caseService.updateCase(targetId, updatePayload);
      if (res?.success && res.case) {
        setCaseData(res.case);
        setIsEditModalOpen(false);
        setNotification({
          type: 'success',
          message: 'Structured medical case updated successfully.',
        });
      }
    } catch (err) {
      setEditError(err.message || 'Failed to save case changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Document Inspection Handler
  const handleViewDocument = async (docId) => {
    if (!docId) return;
    const convId = caseData?.conversationId || conversationId;
    if (!convId) return;

    try {
      setIsLoadingDoc(true);
      setDocError(null);
      setSelectedDocData({ id: docId });

      const res = await documentService.getDocument(convId, docId);
      if (res?.success && res.document) {
        setSelectedDocData(res.document);
      } else {
        throw new Error('Failed to retrieve document record');
      }
    } catch (err) {
      setDocError(err.message || 'Failed to load document text');
    } finally {
      setIsLoadingDoc(false);
    }
  };

  // Auto-dismiss notification after 5s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const backUrl =
    role === 'professional'
      ? '/professional/cases'
      : caseData?.conversationId
      ? `/patient/consultation/${caseData.conversationId}`
      : '/patient/cases';

  return (
    <div className="case-review-page">
      {/* Top Breadcrumb Navigation */}
      <div className="case-review-page__top-bar">
        <Link to={backUrl} className="btn-case-back">
          &larr; Back to {role === 'professional' ? 'Reviewed Cases' : 'Workspace'}
        </Link>

        {caseData?.conversationId && (
          <div className="case-review-page__conv-link">
            <span>Linked Consultation:</span>
            <Link
              to={
                role === 'professional'
                  ? `/professional/queue`
                  : `/patient/consultation/${caseData.conversationId}`
              }
              className="case-link-pill"
            >
              Consultation #{caseData.conversationId.slice(-6)}
            </Link>
          </div>
        )}
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`case-notification case-notification--${notification.type}`}
          role="status"
        >
          <div className="case-notification__content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            className="case-notification__close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* ── STATE 1: INITIAL LOADING ── */}
      {isLoading && (
        <div className="case-state-container">
          <div className="case-spinner-lg" aria-hidden="true" />
          <h2 className="case-state-title">Loading Structured Medical Case...</h2>
          <p className="case-state-desc">
            Organizing patient-reported intake data, verified lab findings, and source provenance.
          </p>
        </div>
      )}

      {/* ── STATE 2: CASE NOT YET CREATED ── */}
      {!isLoading && isCaseNotCreated && (
        <div className="case-state-container">
          <div className="case-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="case-state-title">Medical Case Not Initialized</h2>
          <p className="case-state-desc">
            A structured medical case has not yet been assembled for this consultation session.
            You can initialize it now to organize clinical facts and findings.
          </p>

          <div className="case-state-actions">
            <button
              type="button"
              className="btn-case-primary"
              onClick={handleInitializeCase}
              disabled={isInitializing}
            >
              {isInitializing ? 'Initializing Case...' : 'Initialize Case & Extract Findings'}
            </button>
            <Link
              to={`/patient/consultation/${conversationId}`}
              className="btn-case-secondary"
            >
              Return to Consultation Chat
            </Link>
          </div>
        </div>
      )}

      {/* ── STATE 3: ERROR / UNAUTHORIZED ── */}
      {!isLoading && error && !isCaseNotCreated && (
        <div className="case-state-container">
          <div className="case-state-icon text-rose-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="case-state-title">Unable to Load Medical Case</h2>
          <p className="case-state-desc">{error}</p>

          <div className="case-state-actions">
            <button
              type="button"
              className="btn-case-primary"
              onClick={loadCase}
            >
              Retry Loading
            </button>
            <Link to={backUrl} className="btn-case-secondary">
              Return to Cases
            </Link>
          </div>
        </div>
      )}

      {/* ── STATE 4: CASE FOUND & LOADED ── */}
      {!isLoading && !error && caseData && (
        <div className="case-review-layout">
          {/* Section A: Case Overview */}
          <CaseOverviewCard
            caseData={caseData}
            userRole={userRole}
            onStatusChange={handleStatusChange}
            isStatusUpdating={isStatusUpdating}
            onOpenEdit={() => setIsEditModalOpen(true)}
          />

          {/* Section B: Case Completeness & Intake Readiness */}
          <CaseCompletenessCard
            completeness={caseData.completeness}
            caseData={caseData}
            userRole={userRole}
            onOpenEdit={() => setIsEditModalOpen(true)}
          />

          {/* Section C: Symptoms & Complaints */}
          <CaseSymptomsCard
            caseData={caseData}
            onOpenEdit={() => setIsEditModalOpen(true)}
          />

          {/* Section C: Medical Background & Vitals */}
          <CaseMedicalBackgroundCard
            caseData={caseData}
            onOpenEdit={() => setIsEditModalOpen(true)}
          />

          {/* Section D: Medical Report Findings from PDFs */}
          <CaseFindingsCard
            caseData={caseData}
            onViewDocument={handleViewDocument}
            conversationDocuments={conversationDocs}
          />

          {/* Section E: Case Discrepancies & Conflicting Assertions */}
          <CaseDiscrepanciesCard
            caseData={caseData}
            onViewDocument={handleViewDocument}
          />

          {/* Section F: Missing Information Tracking */}
          <CaseMissingInfoCard
            caseData={caseData}
            userRole={userRole}
          />
        </div>
      )}

      {/* Document Preview Inspection Modal */}
      {selectedDocData && (
        <DocumentPreviewModal
          documentData={selectedDocData}
          isLoading={isLoadingDoc}
          error={docError}
          onClose={() => setSelectedDocData(null)}
        />
      )}

      {/* Edit Case Modal */}
      {isEditModalOpen && (
        <EditCaseModal
          caseData={caseData}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
          isSaving={isSavingEdit}
          error={editError}
        />
      )}
    </div>
  );
}
