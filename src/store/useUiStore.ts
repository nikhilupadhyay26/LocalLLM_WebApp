import { create } from 'zustand';

// Deliberately separate from useAppStore: that store pulls in the whole
// document/model/chat stack (WebLLM, Transformers.js, parsers, db), which
// must stay out of the eagerly-loaded landing page bundle (PRD Section 7:
// "app shell loads instantly"). HelpModal and its triggers are rendered
// on the landing page too, so they need UI-only state that doesn't drag
// that graph in.
interface UiState {
  helpModalOpen: boolean;
  setHelpModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  helpModalOpen: false,
  setHelpModalOpen(helpModalOpen) {
    set({ helpModalOpen });
  },
}));
