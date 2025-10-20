
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import FloatingMenuExtension from '@tiptap/extension-floating-menu';
import StarterKit from '@tiptap/starter-kit';
import { FC } from 'react';
import styled from 'styled-components';
import { editorStyles } from './editor.styles';

const EditorContainer = styled.div`
  ${editorStyles}
`;

interface ProEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const ProEditor: FC<ProEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit, BubbleMenuExtension.configure({}), FloatingMenuExtension.configure({})],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return null;
  }

  return (
    <EditorContainer>
      <FloatingMenu editor={editor}>
        <div className="floating-menu">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
          >
            Bullet List
          </button>
        </div>
      </FloatingMenu>
      <BubbleMenu editor={editor}>
        <div className="bubble-menu">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
          >
            Bold
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
          >
            Italic
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
          >
            Strike
          </button>
        </div>
      </BubbleMenu>
      <EditorContent editor={editor} />
    </EditorContainer>
  );
};


