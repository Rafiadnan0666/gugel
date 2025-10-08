
import { css } from 'styled-components';

export const editorStyles = css`
  .ProseMirror {
    min-height: 400px;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #fff;
    color: #000;
  }

  .ProseMirror:focus {
    outline: none;
    border-color: #007bff;
  }

  .ProseMirror p {
    margin: 0 0 1rem;
  }

  .ProseMirror h1,
  .ProseMirror h2,
  .ProseMirror h3 {
    margin: 1.5rem 0 1rem;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    margin: 0 0 1rem;
    padding-left: 1.5rem;
  }

  .ProseMirror blockquote {
    margin: 0 0 1rem;
    padding-left: 1rem;
    border-left: 3px solid #ccc;
    color: #666;
  }

  .ProseMirror pre {
    margin: 0 0 1rem;
    padding: 1rem;
    background-color: #f5f5f5;
    border-radius: 4px;
    white-space: pre-wrap;
  }

  .ProseMirror code {
    font-family: 'Courier New', Courier, monospace;
    background-color: #f5f5f5;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
  }

  .floating-menu {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .bubble-menu {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .menu-button {
    padding: 0.5rem;
    border: none;
    background-color: transparent;
    cursor: pointer;
  }

  .menu-button:hover {
    background-color: #f5f5f5;
  }

  .menu-button.is-active {
    background-color: #e0e0e0;
  }
`;
