import {
    apply,
    applyTemplates,
    chain,
    mergeWith,
    move,
    Rule,
    SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';
import {normalize, strings, workspaces} from '@angular-devkit/core';
import {ComponentOptions} from './schema';
import {createHost} from './create-host';

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
            applyTemplates({
                classify: strings.classify,
                dasherize: strings.dasherize,
                name: options.name
            }),
            move(normalize(options.path as string))
        ]);

        return chain([
            mergeWith(templateSource)
        ]);
    };
}
