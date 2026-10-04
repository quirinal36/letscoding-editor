import { cpSync, mkdirSync, rmSync } from 'node:fs';
// Generated vendor assets only; remove files from the previously installed version.
rmSync('public/monaco', {recursive:true,force:true});
mkdirSync('public/monaco', {recursive:true});
cpSync('node_modules/monaco-editor/min/vs', 'public/monaco/vs', {recursive:true});
