import {z, ZodE164, ZodError, ZodSafeParseResult} from "zod";
import {Reference} from "@/model/Dataview";
import {RepositoryResult} from "@/repository/Repository";
import {$ZodErrorTree, $ZodIssue} from "zod/v4/core";

export interface ICharacterError {
    section: string;
    title: string;
    message: string;
    level: "Error" | "Warning";
}

export class ModelError extends Error implements ICharacterError {

    section: string;
    title: string;
    message: string;
    level: "Error" | "Warning";

    constructor({ section, title, message, level }: ICharacterError) {
        super(title);
        this.section = section;
        this.title = title;
        this.message = message;
        this.level = level;
    }
}

export class ModelErrorContainer extends Error {

    constructor(private errors: ModelError[] = []) {
        super("Character sheet calculation failed");
    }

    add(props: ICharacterError) {
        this.errors.push(new ModelError(props));
    }

    isOk() {
        return !this.errors.some(err => err.level === "Error");
    }

    getErrors() {
        return this.errors;
    }
}

export interface Get<T> {
    get(): T;
}

export interface ResultTransformer<T, E, T1, E1> {
    map(t: T): T1,
    mapErr(e: E): E1,
}

export type OkOf<R> = R extends Result<infer T, never>? T: never;
export type ErrOf<R> = R extends Result<never, infer T>? T: never;

export abstract class Result<T, E> implements Get<T | E> {
    protected constructor(readonly ok: boolean) {

    };

    isOk(): this is Get<T> {
        return this.ok;
    }

    isError(): this is Get<E> {
        return !this.ok;
    }

    transform<U>(res: (self: this) => U): U {
        return res(this);
    }

    abstract get(): T | E;
    abstract andThen<T1>(f: (item: T) => Result<T1, E>): Result<T1, E>;
    abstract orElse<E1>(f: (error: E) => Result<T, E1>): Result<T, E1>;
    abstract map<U>(f: (item: T) => U): Result<U, E>;
    abstract mapErr<U>(f: (error: E) => U): Result<T, U>;
    abstract unwrap(): T;
    abstract unwrapError(): E
    abstract unwrapOr(defaultItem: T): T;
    abstract unwrapErrorOr(defaultItem: E): E;
    abstract unwrapOrElse<T1>(f: (error: E) => T1): T | T1;
    abstract unwrapOrElse(f: (error: E) => T): T;
    abstract unwrapErrorOrElse<E1>(f: (item: T) => E1): E | E1;
    abstract unwrapErrorOrElse(f: (item: T) => E): E;
    abstract expect(message: string): T;
    abstract expectErr(message: string): E;

    static ok<T>(item: T): Result<T, never> {
        return new ResultOkImpl(item);
    }

    static error<E>(item: E): Result<never, E> {
        return new ResultErrorImpl(item);
    }
}

export type ResultOk<T> = Result<T, never> & {
    item: T
};

export type ResultError<E> = Result<never, E> & {
    error: E
}

class ResultOkImpl<T> extends Result<T, never> implements ResultOk<T>, Get<T> {
    constructor(readonly item: T) {
        super(true);
    }

    override get() {
        return this.item;
    }

    override andThen<T1, E>(f: (item: T) => Result<T1, E>): Result<T1, E> {
        return f(this.item);
    }

    override orElse<E1>(f: (error: never) => Result<T, E1>): Result<T, E1> {
        return this;
    }

    override map<U>(f: (item: T) => U): Result<U, never> {
        return new ResultOkImpl(f(this.item));
    }

    override mapErr<U>(f: (error: never) => U): Result<T, U> {
        return this;
    }

    override unwrap(): T {
        return this.item;
    }

    override unwrapError(): never {
        throw new Error("Called `unwrapError()` on an `Ok` value");
    }

    override unwrapOr(defaultItem: T): T {
        return this.item;
    }

    override unwrapErrorOr<E>(defaultItem: E): E {
        return defaultItem;
    }

    override unwrapOrElse(f: (error: never) => T): T {
        return this.item;
    }

    override unwrapErrorOrElse(f: (item: T) => never): never
    override unwrapErrorOrElse<E>(f: (item: T) => E): E {
        return f(this.item);
    }

    override expect(message: string): T {
        return this.item;
    }

    override expectErr(message: string): never {
        throw new Error(message);
    }
}

class ResultErrorImpl<T> extends Result<never, T> implements ResultError<T>, Get<T> {
    constructor(readonly error: T) {
        super(false);
    }

    override get() {
        return this.error;
    }

    override andThen<T1>(f: (item: never) => Result<T1, T>): Result<T1, T> {
        return this as unknown as Result<T1, T>;
    }

    override orElse<E1>(f: (error: T) => Result<never, E1>): Result<never, E1> {
        return f(this.error);
    }

    override map<U>(f: (item: never) => U): Result<never, T> {
        return this;
    }

    override mapErr<U>(f: (error: T) => U): Result<never, U> {
        return new ResultErrorImpl(f(this.error));
    }

    override unwrap(): never {
        throw this.error;
    }

    override unwrapError(): T {
        return this.error;
    }

    override unwrapOr<U>(defaultItem: U): U {
        return defaultItem;
    }

    override unwrapErrorOr(defaultItem: T): T {
        return this.error;
    }

    override unwrapOrElse(f: (error: T) => never): never
    override unwrapOrElse<U>(f: (error: T) => U): U {
        return f(this.error);
    }

    override unwrapErrorOrElse(f: (item: never) => T): T {
        return this.error;
    }

    override expect(message: string): never {
        throw new Error(message);
    }

    override expectErr(message: string): T {
        return this.error;
    }
}