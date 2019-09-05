import sha256 from 'sha256';
export default abstract class SecurityUtil {
    public static hash(input: string): string {
        return sha256(input);
    }
}