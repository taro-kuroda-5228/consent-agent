export type UnderstandingQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  concept: string;
};

export function getUnderstandingQuestions(): UnderstandingQuestion[] {
  return [
    {
      id: 'q1',
      question: '今回の病気はどの血管に起きていますか？',
      options: ['肺動脈', '大動脈', '冠動脈', '腎動脈'],
      correctIndex: 1,
      concept: '疾患部位（大動脈）',
    },
    {
      id: 'q2',
      question: 'なぜ緊急手術が必要ですか？',
      options: ['痛みが強いから', '血管が破裂する危険があるから', '感染するから', '薬が効かないから'],
      correctIndex: 1,
      concept: '緊急手術の理由（破裂の危険）',
    },
    {
      id: 'q3',
      question: '手術の主なリスクは何ですか？',
      options: ['出血・脳梗塞など', '傷が残る', '入院が長い', '痛い'],
      correctIndex: 0,
      concept: '主な手術リスク',
    },
    {
      id: 'q4',
      question: '最終的な判断は誰がしますか？',
      options: ['AI', '家族', '担当医師', '看護師'],
      correctIndex: 2,
      concept: '最終判断者（担当医師）',
    },
  ];
}
