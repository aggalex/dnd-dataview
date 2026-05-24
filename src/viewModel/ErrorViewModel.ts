import {$ZodErrorTree, $ZodIssue} from "zod/v4/core";
import {ModelError, ModelErrorContainer} from "@/model/Error";
import {z, ZodError} from "zod";
import {Reference} from "@/model/Dataview";
import {RepositoryResult} from "@/repository/Repository";

type Issue = {
    issue: $ZodIssue;
    toString(): string
}

export class ErrorViewModel {

    readonly errors = new ModelErrorContainer();

    addZodError(error: ZodError, reference: Reference, section: string, level: "Error" | "Warning") {
        const message = this.formatZodErrorTree(z.treeifyError(error, this.formatZodIssue.bind(this)));
        const modelError = new ModelError({
            section,
            level,
            title: `Issues on section ${section} (${reference})`,
            message,
        });

        this.errors.add(modelError);
    }

    addModelErrors<T>(res: RepositoryResult<T>, ref: Reference, section: string): T | undefined {
        return res
            .mapErr(err => {
                this.addZodError(err, ref, section, "Error");
                return undefined;
            })
            .map(({ output, warnings }) => {
                warnings && this.addZodError(warnings, ref, section, "Warning");
                return output;
            })
            .get()
    }

    handle(ref: Reference, section: string): <T>(res: RepositoryResult<T>) => T | undefined {
        return res => this.addModelErrors(res, ref, section)
    }

    private formatZodIssue(issue: $ZodIssue): Issue {
        return {
            issue,
            toString() {
                return `[${issue.path}:: ${issue.input}] ${issue.message}`
            }
        }
    }

    private formatZodArrayItems(errorTree: $ZodErrorTree<unknown[], Issue> | $ZodErrorTree<[any, ...any[]], Issue>, padding: string) {
        return errorTree.items
            ?.map((tree, i) => tree
                    ? padding + `${i}. [:: ${tree?.errors[0].issue.input}] ${this.formatZodErrorTree(tree, padding + "  ")}`
                    : '')
            .join("\n") ?? ""
    }

    private formatZodObjectItems(errorTree: $ZodErrorTree<{ [key: string | symbol | number]: unknown }, Issue>, padding: string) {
        return Object.entries(errorTree.properties ?? {})
            .filter((entry): entry is [string, NonNullable<typeof entry[1]>] => !!entry[1])
            .map(([key, value]) => padding + `- [${key}:: ${value?.errors[0].issue.input}] ${this.formatZodErrorTree(value, padding + "  ")}`)
            .join("\n") ?? ""
    }

    private formatZodErrorTree<U>(errorTree: $ZodErrorTree<U, Issue>, padding: string = ""): string {
        const base = errorTree.errors.map(err => `${err.issue.message}`).join(",");
        const extra =
            'items' in errorTree? this.formatZodArrayItems(errorTree, padding):
            'properties' in errorTree? this.formatZodObjectItems(errorTree, padding):
                ''

        return `${base}\n${extra}`
    }
}