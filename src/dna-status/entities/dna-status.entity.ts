export class DnaStatus {
  human_design: boolean = false;
  numerology: boolean = false;
  astrology: boolean = false;

  constructor(humanDesign?: boolean, numerology?: boolean, astrology?: boolean) {
    this.human_design = humanDesign || false;
    this.numerology = numerology || false;
    this.astrology = astrology || false;
  }
}
