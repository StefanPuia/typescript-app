export class CaseUtil {
    public static readonly SNAKE: CaseType = "SNAKE";
    public static readonly CAMEL: CaseType = "CAMEL";
    public static readonly PASCAL: CaseType = "PASCAL";

    private fromType: CaseType;
    private toType: CaseType | undefined;

    private constructor(fromType: CaseType) {
        this.fromType = fromType;
    }

    public static from(fromType: CaseType): CaseUtil {
        return new CaseUtil(fromType);
    }

    public to(toType: CaseType): CaseUtil {
        this.toType = toType;
        return this;
    }

    public convert(input: string): string {
        if (this.fromType && this.toType && input) {
            let tokens: Array<string> = [];
            switch(this.fromType) {
                case CaseUtil.SNAKE:
                    tokens = SnakeCase.tokenize(input);
                    break;

                case CaseUtil.CAMEL:
                    tokens = CamelCase.tokenize(input);
                    break;

                case CaseUtil.PASCAL:
                    tokens = PascalCase.tokenize(input);
                    break;
            }

            switch (this.toType) {
                case CaseUtil.SNAKE:
                    return SnakeCase.compose(tokens);

                case CaseUtil.CAMEL:
                    return CamelCase.compose(tokens);

                case CaseUtil.PASCAL:
                    return PascalCase.compose(tokens);
            }
        }
        throw new Error("Case converter not initialised properly!");
    }
}

abstract class CaseConverter {
    static tokenize(input: string): Array<string> { return [input]; }
    static compose(tokens: Array<string>): string { return tokens.join(""); }
}

class SnakeCase extends CaseConverter {
    public static tokenize(input: string) {
        return input.split(/_/g);
    }

    public static compose(tokens: Array<string>) {
        return tokens.join("_").toLowerCase();
    }
}

class PascalCase extends CaseConverter {
    public static tokenize(input: string) {
        return input.split(/(?=[A-Z])/g);
    }

    public static compose(tokens: Array<string>) {
        return tokens.map(x => x.substr(0, 1).toUpperCase() + x.substr(1).toLowerCase()).join("");
    }
}

class CamelCase extends PascalCase {
    public static compose(tokens: Array<string>) {
        const composed = super.compose(tokens);
        return composed.substr(0, 1).toLowerCase() + composed.substr(1);
    }
}

type CaseType = "SNAKE" | "CAMEL" | "PASCAL";