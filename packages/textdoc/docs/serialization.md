# Serialization

`toTextDocJson` returns a stable JSON object for a final `TextDocument`.

`fromTextDocJson` validates and returns a final `TextDocument`. Old document payloads, bundle payloads, task graph profile payloads, and compatibility payloads are not accepted as aliases.
