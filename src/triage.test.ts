import { evaluateTriageForCdst } from "./triage";

// Input Examples
const validInput = {
  encounterId: 'enc_001',
  patientId: 'pat_123',
  department: 'emergency',
  chiefComplaint: 'Chest pain and shortness of breath',
  symptoms: ['chest pain', 'shortness of breath'],
  vitals: {
    temperatureC: 39.1,
    systolicBp: 182,
    diastolicBp: 122,
    heartRate: 118,
    respiratoryRate: 28,
    oxygenSaturation: 91
  },
  observations: 'Patient appears distressed'
};

const normalInput = {
  encounterId: 'enc_002',
  patientId: 'pat_456',
  department: 'general',
  chiefComplaint: 'Routine checkup',
  symptoms: ['mild headache'],
  vitals: {
    temperatureC: 37.0,
    systolicBp: 120,
    diastolicBp: 80,
    heartRate: 72,
    respiratoryRate: 16,
    oxygenSaturation: 98
  }
};


describe('evaluateTriageForCdst', () => {

    // Validation tests
    describe('validation', ()=> {
        it("should return ok:false for null input", () => {
        const result = evaluateTriageForCdst(null)

        expect(result.ok).toBe(false);
      });

      it('should return ok: false for a non-object input', () =>{
        expect(evaluateTriageForCdst(10).ok).toBe(false);
        expect(evaluateTriageForCdst('hello').ok).toBe(false)
        expect(evaluateTriageForCdst(undefined).ok).toBe(false)
      });

      it('should return ok: false when encounterId is missing', () => {
        const { encounterId, ...rest} = validInput;
        const result = evaluateTriageForCdst(rest);
        expect(result.ok).toBe(false);
      });

      it('should return ok: false when a required string field is empty', () =>{
       const result = evaluateTriageForCdst({
              ...validInput,
              chiefComplaint: ''
       });
       expect(result.ok).toBe(false);
      
      });

      it('should return ok: false when synptoms is not an array', () => {
        const result = evaluateTriageForCdst(
            {
                ...validInput,
                symptoms: 'chest pain'
            }
        );
        expect(result.ok).toBe(false);
      });

      it('should return ok: false when symptoms contains a non-string', () => {
        const result = evaluateTriageForCdst({
            ...validInput,
            symptoms: ['chest pain', 42]
        });
        expect(result.ok).toBe(false);
      });

      it('should return ok: false when vitals is missing', () => {
        const { vitals, ...rest} = validInput;
        const result = evaluateTriageForCdst(rest);
        expect(result.ok).toBe(false);
      });

      it('should return ok: false when a vital is out of range', () => {
        const result = evaluateTriageForCdst({
            ...validInput,
            vitals: {
                ...validInput.vitals,
                temperatureC: 20
            }
        });
        expect(result.ok).toBe(false);
      });

      it('should return ok: false when vital is above the maximum', () => {
        const result = evaluateTriageForCdst({
            ...validInput,
            vitals: {
                ...validInput.vitals,
                heartRate: 300
            }
        });
        expect(result.ok).toBe(false);
      });

      it('should return ok: false when a vital is not a number', () => {
        const result = evaluateTriageForCdst({
            ...validInput,
            vitals:{
                ...validInput.vitals,
                temperatureC: '39.1'
            }
        });
        expect(result.ok).toBe(false);
      });

      it('should return ok: true when observations is missing', () => {
        const { observations, ...rest} = validInput;
        const result = evaluateTriageForCdst(rest);
        expect(result.ok).toBe(true);
      });
    });

    // Flag generation test
    describe('flag generation', () => {
        it('should return all four flags for the example input', () => {
            const result = evaluateTriageForCdst(validInput);
            expect(result.ok).toBe(true);

            if (result.ok){
                expect(result.flags).toHaveLength(4);

                const codes = result.flags.map(f => f.code);

                expect(codes).toContain('HIGH_FEVER');
                expect(codes).toContain('SEVERE_HYPERTENSION');
                expect(codes).toContain('LOW_OXYGEN_SATURATION');
                expect(codes).toContain('EMERGENCY_RED_FLAG_SYMPTOM');
            }
        });

        it('should return no flags for normal vitals', () => {
            const result = evaluateTriageForCdst(normalInput);
            expect(result.ok).toBe(true);
            if (result.ok){
                expect(result.flags).toHaveLength(0);
            }
        });

        it('should trigger only HIGH_FEVER when only temperature is elevated', () => {
            const result = evaluateTriageForCdst({
                ...normalInput,
                vitals: {
                    ...normalInput.vitals,
                    temperatureC: 39.5
                }
            });
            expect(result.ok).toBe(true);
            if (result.ok){
                expect(result.flags).toHaveLength(1);
                const codes = result.flags.map(f => f.code);
                expect(codes).toContain('HIGH_FEVER');
            }
        });

        it('should trigger SEVERE_HYPERTENSION when only systolic is elevated', () => {
            const result = evaluateTriageForCdst({
                ...normalInput,
                vitals: {...normalInput.vitals, systolicBp: 185}
            });

            expect(result.ok).toBe(true);
            if (result.ok){
                const codes = result.flags.map(f => f.code);
                expect(codes).toContain('SEVERE_HYPERTENSION');
            }
        });

        it('should trigger SEVERE_HYPERTENSION when only diastolic is elevated', () => {
            const result = evaluateTriageForCdst({
                ...normalInput,
                vitals: { ...normalInput.vitals, diastolicBp: 125 }
            });
            expect(result.ok).toBe(true);
            if (result.ok) {
            const codes = result.flags.map(f => f.code);
            expect(codes).toContain('SEVERE_HYPERTENSION');
            }
        });

        it('should match symptoms case-insensitivity', () => {
            const result = evaluateTriageForCdst({
                ...normalInput,
                symptoms: ['Chest Pain']
            });
            expect(result.ok).toBe(true);
            if(result.ok){
                const codes = result.flags.map(f => f.code);
                expect(codes).toContain('EMERGENCY_RED_FLAG_SYMPTOM');
            }
        });

        it('should match symptoms that partially contain a red flag term', () => {
            const result = evaluateTriageForCdst({
                ...normalInput,
                symptoms: ['severe chest pain']
            });
            expect(result.ok).toBe(true);
            if(result.ok){
                const codes = result.flags.map(f => f.code);
                expect(codes).toContain('EMERGENCY_RED_FLAG_SYMPTOM');
            }
        });

        it('should include the correct severity on each flag', () =>{
            const result = evaluateTriageForCdst(validInput);
            if(result.ok){
                const flagMap = Object.fromEntries(result.flags.map(f => [f.code, f]));
                const fever = flagMap['HIGH_FEVER'];
                const hypertension = flagMap['SEVERE_HYPERTENSION'];
                const oxygen = flagMap['LOW_OXYGEN_SATURATION'];
                const emergency = flagMap['EMERGENCY_RED_FLAG_SYMPTOM'];

                expect(fever).toBeDefined();
                expect(hypertension).toBeDefined();
                expect(oxygen).toBeDefined();
                expect(emergency).toBeDefined();

                if (fever && hypertension && oxygen && emergency){
                    expect(fever.severity).toBe('warning');
                    expect(hypertension.severity).toBe('critical');
                    expect(oxygen.severity).toBe('critical');
                    expect(emergency.severity).toBe('critical');
                }

            }
        });

    });

    // Disclaimer test

    describe('disclaimer', () => {
        it('should always include the disclaimer on success', () => {
            const result = evaluateTriageForCdst(validInput);
            if(result.ok){
                expect(result.disclaimer).toBe('Clinical decision support only. Not a diagnosis.');
            }
        });
    });
   
});

