// import '@mdxeditor/editor/style.css';
// import './rich-text-editor.scss';

// import {
//   allowSetImageDimensions$,
//   BoldItalicUnderlineToggles,
//   Button,
//   closeImageDialog$,
//   codeBlockPlugin,
//   codeMirrorPlugin,
//   CreateLink,
//   headingsPlugin,
//   imageDialogState$,
//   imagePlugin,
//   imageUploadHandler$,
//   InsertCodeBlock,
//   InsertImage,
//   insertJsx$,
//   jsxPlugin,
//   linkDialogPlugin,
//   linkPlugin,
//   listsPlugin,
//   ListsToggle,
//   MDXEditor,
//   MDXEditorMethods,
//   saveImage$,
//   toolbarPlugin,
// } from '@mdxeditor/editor';
// import { useCellValues, usePublisher } from '@mdxeditor/gurx';
// import { Loading } from '@digital-twin/components';
// import { PlayCircle } from '@digital-twin/icons';
// import { clsx } from 'clsx';
// import { useEffect, useRef } from 'react';

// import styles from './rich-text-editor.module.scss';

// const VideoPlayer = (props: { src: string }) => {
//   console.log('Rendering Video with src:', props.src);
//   return (
//     <div className="video-wrapper">
//       <video src={props.src} controls className="rich-text-video" />
//     </div>
//   );
// };

// const InsertVideo = ({ uploadHandler }: { uploadHandler?: (file: File) => Promise<string> }) => {
//   const insertJsx = usePublisher(insertJsx$);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file && uploadHandler) {
//       try {
//         const url = await uploadHandler(file);
//         insertJsx({
//           name: 'VideoPlayer',
//           kind: 'flow',
//           props: { src: url },
//         });
//       } catch (error) {
//         console.error('Video upload failed:', error);
//       }
//     }
//     event.target.value = '';
//   };

//   return (
//     <>
//       <input
//         type="file"
//         ref={fileInputRef}
//         style={{ display: 'none' }}
//         accept="video/mp4,video/webm"
//         onChange={handleFileChange}
//       />
//       <Button title="Insert video" onClick={() => fileInputRef.current?.click()}>
//         {/* You can use a Video Icon here from a library like lucide-react */}
//         <PlayCircle />
//       </Button>
//     </>
//   );
// };

// const ImageDialog = () => {
//   const [state] = useCellValues(imageDialogState$, imageUploadHandler$, allowSetImageDimensions$);
//   const saveImage = usePublisher(saveImage$);
//   const closeImageDialog = usePublisher(closeImageDialog$);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     if (state.type !== 'inactive') {
//       fileInputRef.current?.click();

//       const handleWindowFocus = () => {
//         setTimeout(() => {
//           closeImageDialog();
//           window.removeEventListener('focus', handleWindowFocus);
//         }, 300);
//       };

//       window.addEventListener('focus', handleWindowFocus);

//       return () => {
//         window.removeEventListener('focus', handleWindowFocus);
//       };
//     }
//   }, [state.type, closeImageDialog]);

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];

//     if (file) {
//       saveImage({
//         src: '',
//         altText: file.name,
//         title: file.name,
//         file: event.target.files!,
//       });
//     }

//     event.target.value = '';
//   };

//   if (state.type === 'inactive') return null;

//   return (
//     <input
//       type="file"
//       ref={fileInputRef}
//       style={{ display: 'none' }}
//       accept="image/png, image/jpeg, image/jpg"
//       onChange={handleFileChange}
//     />
//   );
// };

// type RichTextEditorProps = {
//   defaultValues?: string;
//   readOnly?: boolean;
//   toolbarClassName?: string;
//   onBlur?: (value: string) => void;
//   imageUploadHandler?: (image: File) => Promise<string>;
//   videoUploadHandler?: (video: File) => Promise<string>;
//   isLoading?: boolean;
// };

// export const RichTextEditor = ({
//   defaultValues,
//   readOnly,
//   toolbarClassName,
//   onBlur,
//   imageUploadHandler,
//   videoUploadHandler,
//   isLoading,
// }: RichTextEditorProps) => {
//   const mdxEditorRef = useRef<MDXEditorMethods>(null);
//   useEffect(() => {
//     if (defaultValues) mdxEditorRef?.current?.setMarkdown(defaultValues);
//   }, [defaultValues]);

//   const plugins = [
//     headingsPlugin(),
//     linkPlugin(),
//     linkDialogPlugin(),
//     listsPlugin(),
//     imagePlugin({
//       imageUploadHandler,
//       ImageDialog,
//     }),
//     codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
//     codeMirrorPlugin({
//       codeBlockLanguages: {
//         js: 'JavaScript',
//       },
//     }),
//     jsxPlugin({
//       jsxComponentDescriptors: [
//         {
//           name: 'VideoPlayer',
//           kind: 'flow',
//           props: [{ name: 'src', type: 'string' }],
//           hasChildren: false,
//           Editor: (props) => {
//             const src = props.mdastNode.attributes.find(
//               (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'src'
//             )?.value as string;

//             return <VideoPlayer src={src || ''} />;
//           },
//         },
//       ],
//     }),
//   ];

//   const handleBlur = () => {
//     const currentMarkdown = mdxEditorRef.current?.getMarkdown() || '';
//     onBlur?.(currentMarkdown);
//   };

//   return (
//     <div className={styles.RichTextEditor} onBlur={handleBlur}>
//       <Loading isLoading={isLoading ?? false} />
//       <MDXEditor
//         ref={mdxEditorRef}
//         className={styles.RichTextEditor__Editor}
//         contentEditableClassName={styles.RichTextEditor__ContentEditable}
//         readOnly={readOnly}
//         spellCheck={false}
//         markdown={defaultValues ?? ''}
//         plugins={
//           readOnly
//             ? plugins
//             : [
//                 ...plugins,
//                 toolbarPlugin({
//                   toolbarClassName: clsx(styles.RichTextEditor__Toolbar, toolbarClassName),
//                   toolbarContents: () => (
//                     <>
//                       <BoldItalicUnderlineToggles />
//                       <CreateLink />
//                       <ListsToggle />
//                       <InsertImage />
//                       <InsertCodeBlock />
//                       <InsertVideo uploadHandler={videoUploadHandler} />
//                     </>
//                   ),
//                 }),
//               ]
//         }
//       />
//     </div>
//   );
// };
