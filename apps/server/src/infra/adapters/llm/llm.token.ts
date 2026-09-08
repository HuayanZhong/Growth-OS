/** DI token for the active LLM adapter; consumers @Inject(LLM_ADAPTER), never a concrete class */
export const LLM_ADAPTER = Symbol('LLM_ADAPTER')
