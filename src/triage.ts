// Interfaces

export interface Vitals{
    temperatureC: number;
    systolicBp: number;
    diastolicBp:  number;
    heartRate: number;
    respiratoryRate: number;
    oxygenSaturation: number;
}



export interface NormalizedTriage{
    encounterId: string;
    patientId: string;
    department: string;
    chiefComplaint: string;
    symptoms: string[];
    vitals: Vitals;
    observations? : string;
}



export interface CdstFlag{
    code: string;
    severity: 'warning' | 'critical';
    message: string;
    evidence: string;
}



export type CdstResult = | {ok: true; data: NormalizedTriage; flags: CdstFlag[]; disclaimer:string} 
                        | {ok: false; errorCode: string; message: string}



// Helper functions
function isNonEmptyString(value: unknown): value is string {
        return typeof value === 'string' && value.trim().length > 0;
}




function isInRange(value: number, min: number, max: number): boolean{
    return value >= min && value <= max;
}



function isStringArray(value: unknown): value is string[] {
        return Array.isArray(value) && value.every(item => typeof item === 'string')
}




const requiredStrings = ['encounterId', 'patientId', 'department', 'chiefComplaint'] as const;



const vitalRules = [
  { key: 'temperatureC',      min: 30, max: 45 },
  { key: 'systolicBp',         min: 60, max: 260 },
  { key: 'diastolicBp',        min: 30, max: 180 },
  { key: 'heartRate',          min: 20, max: 250 },
  { key: 'respiratoryRate',    min: 5,  max: 80 },
  { key: 'oxygenSaturation',   min: 50, max: 100 },
] as const;

function validateInput(input: unknown):
    | { valid: true; data: NormalizedTriage}
    | { valid:false; errorCode: string; message: string}{

        if (typeof input !== 'object' || input === null){
            return {valid: false, errorCode: 'INVALID_INPUT', message: 'Input must be a non-null object'}
        }

        const raw = input as Record<string, unknown>;

        for( const field of requiredStrings){
            if (!isNonEmptyString(raw[field])){
                return {
                    valid: false,
                    errorCode: "MISSING_FIIELD",
                    message: `${field} is required and must be a non-empty string`
                };
            }
        }


        if(!isStringArray(raw.symptoms)){
            return {valid: false, errorCode: 'INVALID_FIELD', message: 'symptoms must be an array of strings'}
        };

        const rawVitals = raw.vitals
        if (typeof rawVitals !== 'object' || rawVitals === null) {
            return { valid: false, errorCode:'MISSING_FIELD', message:'vitals are required and must be an object'}

        }

        const vitals = rawVitals as Record<string, unknown>;

        for(const rule of vitalRules){
            const val = vitals[rule.key];
            if(typeof val !== 'number' || !isInRange(val, rule.min, rule.max)){
                return{
                    valid: false,
                    errorCode: 'VITAL_OUT_OF_RANGE',
                    message: `${rule.key} must be a number between ${rule.min} and ${rule.max}`
                };
            }
        }

        const data: NormalizedTriage = {
            encounterId: raw.encounterId as string,
            patientId: raw.patientId as string,
            department: raw.department as string,
            chiefComplaint: raw.chiefComplaint as string,
            symptoms: raw.symptoms as string[],
            vitals: {
            temperatureC: vitals.temperatureC as number,
            systolicBp: vitals.systolicBp as number,
            diastolicBp: vitals.diastolicBp as number,
            heartRate: vitals.heartRate as number,
            respiratoryRate: vitals.respiratoryRate as number,
            oxygenSaturation: vitals.oxygenSaturation as number,
        },
    };

    if (isNonEmptyString(raw.observations)){
        data.observations = raw.observations;
    }

    return { valid: true, data};

    }

    
// Generate Flags

const RED_FLAG_SYMPTOMS = ['chest pain', 'shortness of breath'] as const;

function generateFlags(triage: NormalizedTriage): CdstFlag[] {
    const flags: CdstFlag[] = [];


    if (triage.vitals.temperatureC >=39){
        flags.push({
            code: 'HIGH_FEVER',
            severity: 'warning',
            message: 'Patient temperature is high',
            evidence: `temperatureC: ${triage.vitals.temperatureC}`
        });
    }

    const { systolicBp, diastolicBp } = triage.vitals;
    if (systolicBp >= 180 || diastolicBp >=120){
        flags.push({
            code: 'SEVERE_HYPERTENSION',
            severity: 'critical',
            message: 'Blood pressure is at hypertensive level, Immediate care required.',
            evidence: `systolicBp ${systolicBp} mmHg, diastolicBp: ${diastolicBp} mmHg`
        });
    }

    if (triage.vitals.oxygenSaturation < 92){
        flags.push({
            code: 'LOW_OXYGEN_SATURATION',
            severity: 'critical',
            message: 'Oxygen saturation is critically low. Oxygen may be required',
            evidence: `oxygenSaturation: ${triage.vitals.oxygenSaturation}`
        });
    }

    // Emergency Red Flag Symptom

        const normalisedSymptoms = triage.symptoms.map(s => s.toLowerCase());

        const matchedRedFlags = RED_FLAG_SYMPTOMS.filter(term =>
        normalisedSymptoms.some(symptom => symptom.includes(term))
        );

        if (matchedRedFlags.length > 0) {
            flags.push({
            code: 'EMERGENCY_RED_FLAG_SYMPTOM',
            severity: 'critical',
            message: 'One or more emergency red flag symptoms detected. Immediate clinical review required.',
            evidence: `Matched red flag terms: ${matchedRedFlags.join(', ')}`
            });
        }

    return flags;

}


// Main function Implementation
export function evaluateTriageForCdst(input: unknown): CdstResult{
    const validation = validateInput(input);

    if (!validation.valid){
        return {
            ok: false,
            errorCode: validation.errorCode,
            message: validation.message
        };
    }

    const flags = generateFlags(validation.data);

    return{
        ok: true,
        data: validation.data,
        flags,
        disclaimer: 'Clinical decision support only. Not a diagnosis.'
    };
}

