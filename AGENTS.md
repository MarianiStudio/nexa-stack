Your training materials and internal knowledge regarding Next.js, Tailwind CSS v4, React, shadcn/ui, and PocketBase are outdated. 

You must strictly follow these rules before writing or modifying any code:

1. **Definitive Source of Truth**: The local documentation inside `library/` is the absolute source of truth, not your own knowledge. Never write code without verifying its implementation in the local documentation first.
2. **Cascading Lookup Method (Mandatory)**:
   To prevent token waste while ensuring accurate multi-file lookups, navigate the library in a 3-step cascade:
   - **Step 1**: Open the Master Index at `library/00-INDEX.md` to identify the correct technology directories.
   - **Step 2**: Open the relevant technology sub-indexes (e.g., `library/pocketbase/00-INDEX.md`) to pinpoint the specific files needed for your task.
   - **Step 3**: Open and read **only the targeted files** identified. You are encouraged to open multiple files if the task requires combining different concepts (e.g., combining pocketbase database operations with event hooks). Avoid bulk-scanning entire directories.
3. **Fixed Tech Choices for This Project**:
   - **shadcn/ui**: This project uses the **Base UI** variant exclusively. When a component has multiple variants (`base`/`radix`/`aria`), always open the `base` version. Never open `radix` or `aria` files.
   - **PocketBase**: This project extends PocketBase with **JSVM** (`pb_hooks/`), not Go. Always use the JSVM-related docs. Never open Go extension files.