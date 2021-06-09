import {
    apply,
    applyTemplates,
    chain,
    filter,
    mergeWith,
    move,
    noop,
    Rule,
    SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';
import {normalize, strings, workspaces} from '@angular-devkit/core';
import {ComponentOptions} from './schema';
import {createHost} from './create-host';
import {addDeclarationToModule} from '@schematics/angular/utility/ast-utils';
import {buildRelativePath} from '@schematics/angular/utility/find-module';
import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {InsertChange} from '@schematics/angular/utility/change';

export function component(options: ComponentOptions): Rule {
    return async (tree: Tree) => {
        const host = createHost(tree);
        const {workspace} = await workspaces.readWorkspace('/', host);

        if (!options.project) {
            // @ts-ignore
            options.project = workspace.extensions.defaultProject;
        }

        const project = workspace.projects.get(options.project!);

        if (!project) {
            throw new SchematicsException(`Invalid project name: ${options.project}`);
        }

        const projectType = project.extensions.projectType === 'application' ? 'app' : 'lib';

        if (options.path === undefined) {
            options.path = `${project.sourceRoot}/${projectType}`;
        }

        const templateSource = apply(url('./files/component'), [
            !options.withTable ? filter((path) => !path.includes(`/table`)) : noop(),
            applyTemplates({
                classify: strings.classify,
                dasherize: strings.dasherize,
                name: options.name
            }),
            move(normalize(options.path as string))
        ]);

        return chain([
            addDeclarationToNgModule(options, Type.Component),
            addDeclarationToNgModule(options, Type.ViewComponent),
            options.withTable ? addDeclarationToNgModule(options, Type.TableComponent) : noop(),
            mergeWith(templateSource)
        ]);
    };
}

function addDeclarationToNgModule(options: ComponentOptions, type: Type): Rule {
    return (host: Tree) => {
        if (!options.module) {
            return host;
        }

        const modulePath = options.module;

        const source = readIntoSourceFile(host, modulePath);

        const componentPath =
            `/${options.path}/` +
            strings.dasherize(options.name) + '/' +
            strings.decamelize(type) + '/' +
            strings.dasherize(options.name + type) +
            '.component';

        const relativePath = buildRelativePath(modulePath, componentPath);
        const classifiedName = strings.classify(options.name) + strings.classify(type + 'Component');
        const declarationChanges = addDeclarationToModule(
            source,
            modulePath,
            classifiedName,
            relativePath
        );

        const declarationRecorder = host.beginUpdate(modulePath);
        for (const change of declarationChanges) {
            if (change instanceof InsertChange) {
                declarationRecorder.insertLeft(change.pos, change.toAdd);
            }
        }
        host.commitUpdate(declarationRecorder);

        return host;
    };
}

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
    const text = host.read(modulePath);
    if (text === null) {
        throw new SchematicsException(`File ${modulePath} does not exist.`);
    }
    const sourceText = text.toString('utf-8');

    return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

enum Type {
    Component = '',
    ViewComponent = 'View',
    TableComponent = 'Table'
}
