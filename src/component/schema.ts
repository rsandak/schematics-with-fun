export interface ComponentOptions {
    // The name of the component.
    name: string;

    // The path to create the component.
    path?: string;

    // The name of the project.
    project?: string;

    withTable: boolean;

    // The name of the module to which components have to be added.
    module: string;
}
