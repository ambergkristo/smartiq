import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bootstrapOnboardingTenant,
  clearRuntimeAuthContext,
  completeRuntimeAuth,
  deleteRuntimeSessionReviewNote,
  deleteRuntimeSessionTemplate,
  fetchTenantAuditEvents,
  fetchTenantRuntimeSnapshot,
  fetchTenantUsageSummary,
  hasRuntimeAuthContext,
  initiateCheckoutSession,
  logoutRuntimeAuth,
  requestRuntimeAuthLink,
  setRuntimeAuthContext,
  upsertRuntimeSessionReviewNote,
  upsertRuntimeSessionTemplate,
  updateRuntimeTenantBranding
} from '../api';
import { resolveHostedRuntimeBlockMessage, buildBrandingDraft, buildSessionTemplateDraft, readRuntimeSessionReviewNotes, readRuntimeSessionTemplates, buildSessionReviewNoteLookup, isSupportedTheme, resolveSessionReviewNote } from './appSessionUtils';
import { STRINGS } from './appConfig';
import { isTestMode } from './appSessionUtils';
import { persistSessionReviewNote } from './appPersistence';

export function useRuntimeWorkspace({ billingReturnState, config, setConfig }) {
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(null);
  const [runtimeWarning, setRuntimeWarning] = useState('');
  const [onboardingDraft, setOnboardingDraft] = useState({
    workspaceName: '',
    ownerEmail: '',
    ownerDisplayName: ''
  });
  const [signInDraft, setSignInDraft] = useState({
    email: '',
    tenantId: ''
  });
  const [onboardingPending, setOnboardingPending] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);
  const [signInPending, setSignInPending] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [signInSuccess, setSignInSuccess] = useState('');
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [brandingDraft, setBrandingDraft] = useState(buildBrandingDraft(null));
  const [brandingPending, setBrandingPending] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState('');
  const [brandingError, setBrandingError] = useState('');
  const [sessionTemplates, setSessionTemplates] = useState([]);
  const [sessionTemplateDraft, setSessionTemplateDraft] = useState(buildSessionTemplateDraft());
  const [sessionTemplatePending, setSessionTemplatePending] = useState(false);
  const [sessionTemplateMessage, setSessionTemplateMessage] = useState('');
  const [sessionTemplateError, setSessionTemplateError] = useState('');
  const [sessionReviewNotes, setSessionReviewNotes] = useState({});
  const [workspaceInsights, setWorkspaceInsights] = useState({
    auditEvents: [],
    usageSummary: []
  });
  const [workspacePending, setWorkspacePending] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [reviewedHostedSession, setReviewedHostedSession] = useState(null);
  const [reviewedHostedSessionNote, setReviewedHostedSessionNote] = useState('');
  const [reviewedHostedSessionNoteMessage, setReviewedHostedSessionNoteMessage] = useState('');
  const [activeHostedSession, setActiveHostedSession] = useState(null);
  const [hostedSessionFilter, setHostedSessionFilter] = useState('all');
  const billingReturnHandledRef = useRef(false);
  const onboardingWorkspaceInputRef = useRef(null);
  const signInEmailInputRef = useRef(null);

  const applyRuntimeSnapshot = useCallback((snapshot) => {
    if (!snapshot) {
      return;
    }
    setRuntimeSnapshot(snapshot);
    setBrandingDraft(buildBrandingDraft(snapshot?.branding));
    setSessionTemplates(readRuntimeSessionTemplates(snapshot?.settings));
    setSessionReviewNotes(readRuntimeSessionReviewNotes(snapshot?.settings));
    const runtimeTheme = snapshot?.settings?.settings?.theme;
    setConfig((prev) => (isSupportedTheme(runtimeTheme) ? { ...prev, theme: runtimeTheme } : prev));
    const primaryColor = snapshot?.branding?.branding?.primaryColor;
    const secondaryColor = snapshot?.branding?.branding?.secondaryColor;
    if (primaryColor) {
      document.documentElement.style.setProperty('--accent', primaryColor);
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--accent2', secondaryColor);
    }
  }, [setConfig]);

  const clearRuntimeSession = useCallback((message = '') => {
    clearRuntimeAuthContext();
    setRuntimeSnapshot(null);
    setRuntimeWarning(message);
    setCheckoutMessage('');
    setCheckoutUrl('');
    setBrandingPending(false);
    setBrandingMessage('');
    setBrandingError('');
    setBrandingDraft(buildBrandingDraft(null));
    setSessionTemplates([]);
    setSessionReviewNotes({});
    setSessionTemplateDraft(buildSessionTemplateDraft());
    setSessionTemplatePending(false);
    setSessionTemplateMessage('');
    setSessionTemplateError('');
    setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
    setWorkspacePending(false);
    setWorkspaceMessage('');
    setWorkspaceError('');
    setReviewedHostedSession(null);
    setReviewedHostedSessionNote('');
    setReviewedHostedSessionNoteMessage('');
    setActiveHostedSession(null);
    setHostedSessionFilter('all');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent2');
  }, []);

  const applyRuntimeAuthAndSnapshot = useCallback(async (runtimeAuth) => {
    setRuntimeAuthContext(runtimeAuth || null);
    const snapshot = await fetchTenantRuntimeSnapshot();
    applyRuntimeSnapshot(snapshot);
  }, [applyRuntimeSnapshot]);

  const refreshWorkspaceInsights = useCallback(async () => {
    if (!runtimeSnapshot?.me?.selectedTenantId || runtimeSnapshot?.capabilities?.analyticsHistoryEnabled !== true) {
      setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
      setWorkspacePending(false);
      return;
    }

    setWorkspacePending(true);
    try {
      const [auditEvents, usageSummary] = await Promise.all([
        fetchTenantAuditEvents({ limit: 8 }),
        fetchTenantUsageSummary({ eventType: 'game.round.completed' })
      ]);
      setWorkspaceInsights({
        auditEvents: Array.isArray(auditEvents) ? auditEvents : [],
        usageSummary: Array.isArray(usageSummary) ? usageSummary : []
      });
    } catch {
      setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
    } finally {
      setWorkspacePending(false);
    }
  }, [runtimeSnapshot]);

  useEffect(() => {
    if (!reviewedHostedSession?.gameId) {
      setReviewedHostedSessionNote('');
      setReviewedHostedSessionNoteMessage('');
      return;
    }
    setReviewedHostedSessionNote(resolveSessionReviewNote(sessionReviewNotes, reviewedHostedSession.gameId));
  }, [reviewedHostedSession, sessionReviewNotes]);

  useEffect(() => {
    setReviewedHostedSessionNoteMessage('');
  }, [reviewedHostedSession?.gameId]);

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeSnapshot() {
      if (!hasRuntimeAuthContext()) {
        return;
      }
      try {
        const snapshot = await fetchTenantRuntimeSnapshot();
        if (!cancelled && snapshot) {
          applyRuntimeSnapshot(snapshot);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error?.code === 'INVALID_AUTH_CONTEXT' || error?.code === 'UNAUTHENTICATED' || error?.status === 401) {
          clearRuntimeSession(STRINGS.sessionExpired);
          return;
        }
        setRuntimeWarning('Tenant runtime context not available; using local defaults.');
      }
    }

    loadRuntimeSnapshot();
    return () => {
      cancelled = true;
    };
  }, [applyRuntimeSnapshot, clearRuntimeSession]);

  useEffect(() => {
    if (!runtimeSnapshot?.me?.selectedTenantId || runtimeSnapshot?.capabilities?.analyticsHistoryEnabled !== true) {
      setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
      setWorkspacePending(false);
      return;
    }
    refreshWorkspaceInsights();
  }, [refreshWorkspaceInsights, runtimeSnapshot]);

  useEffect(() => {
    if (billingReturnHandledRef.current || !billingReturnState || !hasRuntimeAuthContext()) {
      return undefined;
    }
    billingReturnHandledRef.current = true;
    let cancelled = false;

    async function syncBillingReturn() {
      if (billingReturnState === 'cancel') {
        if (!cancelled) {
          setCheckoutMessage(STRINGS.billingReturnCanceled);
        }
        return;
      }
      if (billingReturnState !== 'success') {
        return;
      }

      if (!cancelled) {
        setCheckoutMessage(STRINGS.billingReturnRefreshing);
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const snapshot = await fetchTenantRuntimeSnapshot();
        if (cancelled || !snapshot) {
          return;
        }
        applyRuntimeSnapshot(snapshot);
        const subscriptionStatus = String(snapshot?.subscription?.status || '').trim().toLowerCase();
        const capabilities = snapshot?.capabilities || null;
        const entitlementsActive = subscriptionStatus === 'active'
          || capabilities?.analyticsHistoryEnabled === true
          || capabilities?.customBrandingEnabled === true
          || (Number.isInteger(capabilities?.maxHostedPlayers) && capabilities.maxHostedPlayers > 4);
        if (entitlementsActive) {
          if (!cancelled) {
            setCheckoutMessage(STRINGS.billingReturnRestored);
          }
          return;
        }
        if (attempt < 2) {
          await new Promise((resolve) => {
            setTimeout(resolve, 350);
          });
        }
      }

      if (!cancelled) {
        setCheckoutMessage(STRINGS.billingReturnPending);
      }
    }

    syncBillingReturn();
    return () => {
      cancelled = true;
    };
  }, [applyRuntimeSnapshot, billingReturnState]);

  async function handleOnboardingBootstrap() {
    if (onboardingPending) {
      return;
    }
    setOnboardingPending(true);
    setOnboardingError('');
    setOnboardingSuccess(false);
    setRuntimeWarning('');

    try {
      const response = await bootstrapOnboardingTenant(onboardingDraft);
      await applyRuntimeAuthAndSnapshot(response?.runtimeAuth);
      setOnboardingSuccess(true);
      setSignInSuccess('');
      setOnboardingDraft({
        workspaceName: '',
        ownerEmail: '',
        ownerDisplayName: ''
      });
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not bootstrap onboarding workspace.';
      setOnboardingError(detail);
    } finally {
      setOnboardingPending(false);
    }
  }

  async function handleSignIn() {
    if (signInPending) {
      return;
    }
    setSignInPending(true);
    setSignInError('');
    setSignInSuccess('');
    setRuntimeWarning('');

    try {
      const requestResponse = await requestRuntimeAuthLink(signInDraft);
      const challengeToken = String(requestResponse?.challengeToken || '').trim();
      if (!challengeToken) {
        throw new Error('Sign-in link delivery is not available in this environment.');
      }
      const completeResponse = await completeRuntimeAuth({ challengeToken });
      await applyRuntimeAuthAndSnapshot(completeResponse?.runtimeAuth || null);
      setSignInSuccess(STRINGS.signInSuccess);
      setOnboardingSuccess(false);
      setSignInDraft({ email: '', tenantId: '' });
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not restore host session.';
      setSignInError(detail);
    } finally {
      setSignInPending(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutRuntimeAuth();
    } catch {
      // Stateless runtime logout is best effort.
    } finally {
      clearRuntimeSession(STRINGS.signOutSuccess);
      setSignInSuccess('');
      setOnboardingSuccess(false);
    }
  }

  async function handleUpgradeCheckout() {
    if (checkoutPending) {
      return;
    }
    setCheckoutPending(true);
    setCheckoutMessage('');
    setCheckoutUrl('');
    try {
      const response = await initiateCheckoutSession({
        planCode: 'pilot-monthly',
        billingCycle: 'monthly'
      });
      const sessionId = String(response?.checkoutSessionId || '').trim();
      const nextCheckoutUrl = String(response?.checkoutUrl || '').trim();
      setCheckoutUrl(nextCheckoutUrl);
      if (nextCheckoutUrl && !isTestMode() && typeof window !== 'undefined' && typeof window.location?.assign === 'function') {
        setCheckoutMessage(STRINGS.upgradeRedirecting);
        window.location.assign(nextCheckoutUrl);
        return;
      }
      setCheckoutMessage(
        sessionId
          ? `${STRINGS.upgradeSuccessPrefix} ${sessionId}${nextCheckoutUrl ? ` | ${STRINGS.upgradeRecoveryHint}` : ''}`
          : STRINGS.upgradeSuccessPrefix
      );
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || STRINGS.upgradeErrorFallback;
      setCheckoutMessage(detail);
    } finally {
      setCheckoutPending(false);
    }
  }

  function handleBrandingDraftChange(field, value) {
    setBrandingDraft((prev) => ({
      ...prev,
      [field]: value
    }));
    setBrandingMessage('');
    setBrandingError('');
  }

  async function handleSaveBranding() {
    if (brandingPending || !runtimeSnapshot?.me?.selectedTenantId) {
      return;
    }
    setBrandingPending(true);
    setBrandingMessage('');
    setBrandingError('');
    try {
      const branding = await updateRuntimeTenantBranding(brandingDraft);
      applyRuntimeSnapshot({
        ...runtimeSnapshot,
        branding
      });
      setBrandingMessage(STRINGS.brandingSaved);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not update tenant branding.';
      setBrandingError(detail);
    } finally {
      setBrandingPending(false);
    }
  }

  function handleSessionTemplateDraftChange(value) {
    setSessionTemplateDraft({ name: value });
    setSessionTemplateMessage('');
    setSessionTemplateError('');
  }

  async function handleSaveSessionTemplate(templateInput) {
    if (sessionTemplatePending || !runtimeSnapshot?.me?.selectedTenantId) {
      return;
    }
    setSessionTemplatePending(true);
    setSessionTemplateMessage('');
    setSessionTemplateError('');
    try {
      const response = await upsertRuntimeSessionTemplate(
        globalThis.crypto?.randomUUID?.() || `template-${Date.now()}`,
        templateInput
      );
      setSessionTemplates(Array.isArray(response?.templates) ? response.templates : []);
      setSessionTemplateDraft(buildSessionTemplateDraft());
      setSessionTemplateMessage(STRINGS.sessionTemplatesSaved);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not save session template.';
      setSessionTemplateError(detail);
    } finally {
      setSessionTemplatePending(false);
    }
  }

  function handleReviewedHostedSessionNoteChange(value) {
    setReviewedHostedSessionNote(value);
    setReviewedHostedSessionNoteMessage('');
  }

  async function handleSaveReviewedHostedSessionNote() {
    if (!reviewedHostedSession?.gameId) {
      return;
    }
    const normalizedNote = String(reviewedHostedSessionNote || '').trim();
    if (!normalizedNote) {
      return;
    }
    if (runtimeSnapshot?.me?.selectedTenantId) {
      try {
        const response = await upsertRuntimeSessionReviewNote(reviewedHostedSession.gameId, {
          note: normalizedNote
        });
        setSessionReviewNotes(buildSessionReviewNoteLookup(response?.notes));
      } catch (error) {
        const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
          ? error.detail
          : error?.message || 'Could not save follow-up note.';
        setReviewedHostedSessionNoteMessage(detail);
        return;
      }
    }
    persistSessionReviewNote(reviewedHostedSession.gameId, normalizedNote);
    setReviewedHostedSessionNote(normalizedNote);
    setReviewedHostedSessionNoteMessage(STRINGS.recentHostedSessionNotesSaved);
  }

  async function handleClearReviewedHostedSessionNote() {
    if (!reviewedHostedSession?.gameId) {
      return;
    }
    if (runtimeSnapshot?.me?.selectedTenantId) {
      try {
        const response = await deleteRuntimeSessionReviewNote(reviewedHostedSession.gameId);
        setSessionReviewNotes(buildSessionReviewNoteLookup(response?.notes));
      } catch (error) {
        const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
          ? error.detail
          : error?.message || 'Could not clear follow-up note.';
        setReviewedHostedSessionNoteMessage(detail);
        return;
      }
    }
    persistSessionReviewNote(reviewedHostedSession.gameId, '');
    setReviewedHostedSessionNote('');
    setReviewedHostedSessionNoteMessage(STRINGS.recentHostedSessionNotesCleared);
  }

  async function handleDeleteSessionTemplate(template) {
    const templateId = String(template?.templateId || '').trim();
    if (sessionTemplatePending || !templateId || !runtimeSnapshot?.me?.selectedTenantId) {
      return;
    }
    setSessionTemplatePending(true);
    setSessionTemplateMessage('');
    setSessionTemplateError('');
    try {
      const response = await deleteRuntimeSessionTemplate(templateId);
      setSessionTemplates(Array.isArray(response?.templates) ? response.templates : []);
      setSessionTemplateMessage(STRINGS.sessionTemplatesDeleted);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not delete session template.';
      setSessionTemplateError(detail);
    } finally {
      setSessionTemplatePending(false);
    }
  }

  return {
    runtimeSnapshot,
    runtimeWarning,
    setRuntimeWarning,
    onboardingDraft,
    setOnboardingDraft,
    signInDraft,
    setSignInDraft,
    onboardingPending,
    onboardingError,
    onboardingSuccess,
    signInPending,
    signInError,
    signInSuccess,
    checkoutPending,
    checkoutMessage,
    checkoutUrl,
    brandingDraft,
    brandingPending,
    brandingMessage,
    brandingError,
    sessionTemplates,
    sessionTemplateDraft,
    sessionTemplatePending,
    sessionTemplateMessage,
    setSessionTemplateMessage,
    sessionTemplateError,
    setSessionTemplateError,
    sessionReviewNotes,
    workspaceInsights,
    workspacePending,
    setWorkspacePending,
    workspaceMessage,
    setWorkspaceMessage,
    workspaceError,
    setWorkspaceError,
    reviewedHostedSession,
    setReviewedHostedSession,
    reviewedHostedSessionNote,
    reviewedHostedSessionNoteMessage,
    activeHostedSession,
    setActiveHostedSession,
    hostedSessionFilter,
    setHostedSessionFilter,
    onboardingWorkspaceInputRef,
    signInEmailInputRef,
    refreshWorkspaceInsights,
    handleOnboardingBootstrap,
    handleSignIn,
    handleLogout,
    handleUpgradeCheckout,
    handleBrandingDraftChange,
    handleSaveBranding,
    handleSessionTemplateDraftChange,
    handleSaveSessionTemplate,
    handleReviewedHostedSessionNoteChange,
    handleSaveReviewedHostedSessionNote,
    handleClearReviewedHostedSessionNote,
    handleDeleteSessionTemplate,
    hostLaunchMessage: resolveHostedRuntimeBlockMessage(runtimeSnapshot?.subscription),
    hostLaunchBlocked: Boolean(runtimeSnapshot?.me?.selectedTenantId) && Boolean(resolveHostedRuntimeBlockMessage(runtimeSnapshot?.subscription))
  };
}
