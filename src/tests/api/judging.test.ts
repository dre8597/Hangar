import 'jest';
import supertest from 'supertest';
import { Team } from '../../entities/team';
import { Judge } from '../../entities/judge';
import { ExpandedTeamResult, bonusPointsForIdeaPitch } from '../../api/judging';
import { createJudgeData, createTeamData, visitTeamsAndJudge } from '../utilities';
import { SupportRequest } from '../../entities/supportRequest';
import { SupportRequestType, SupportRequestStatus } from '../../types/supportRequest';
import { JudgingVote } from '../../entities/judgingVote';
import { env } from '../../env';

jest.mock('../../discord');
jest.mock('../../env', () => {
  const realEnv = jest.requireActual('../../env');
  return {
    env: {
      ...realEnv,
      adminSecret: 'Secrets are secretive',
      slackBotToken: 'junk token',
      slackSigningSecret: 'another junk token',
    },
  };
});

/* eslint-disable @typescript-eslint/no-var-requires, global-require */

xdescribe('api/judging', () => {
  let teams: Team[];
  let judges: Judge[];

  beforeAll(async () => {
    teams = await createTeamData(10);
    judges = await createJudgeData(10);
    await visitTeamsAndJudge(judges, teams, 1);
  });

  it('is protected by admin middleware', (done) => {
    // Hide error output for unauth'd request
    jest.mock('../../logger');

    const { app } = require('../../app');
    supertest(app)
      .get('/api/judging/results/')
      .set({
        Authorization: "YOU DIDN'T SAY THE MAGIC WORD!",
      })
      .expect(401, done);
  });

  it('teams will not have bonus points without idea pitches', async () => {
    const requester = teams[0].members[0];
    const request = new SupportRequest(requester, 'Someone', SupportRequestType.TechnicalSupport);
    request.status = SupportRequestStatus.Complete;
    await request.save();

    const { app } = require('../../app');
    const response = await supertest(app)
      .get('/api/judging/results/')
      .set({
        Authorization: env.adminSecret,
      })
      .expect(200);

    const results: ExpandedTeamResult[] = response.body;
    results.forEach((result) => {
      expect(result.bonusPointsAwarded).toBe(0);
      expect(result.finalScore).toBe(result.score);
    });
  });

  it("an abandoned idea pitch won't generate bonus points", async () => {
    const requester = teams[0].members[0];
    const request = new SupportRequest(requester, 'Someone', SupportRequestType.IdeaPitch);
    request.status = SupportRequestStatus.Abandoned;
    await request.save();

    const { app } = require('../../app');
    const response = await supertest(app)
      .get('/api/judging/results/')
      .set({
        Authorization: env.adminSecret,
      })
      .expect(200);

    const results: ExpandedTeamResult[] = response.body;
    results.forEach((result) => {
      expect(result.bonusPointsAwarded).toBe(0);
      expect(result.finalScore).toBe(result.score);
    });
  });

  it('a completed idea pitch will result in bonus points', async () => {
    const bonusTeam = teams[0];
    const requester = bonusTeam.members[0];
    const request = new SupportRequest(requester, 'Someone', SupportRequestType.IdeaPitch);
    request.status = SupportRequestStatus.Complete;
    await request.save();

    const { app } = require('../../app');
    const response = await supertest(app)
      .get('/api/judging/results/')
      .set({
        Authorization: env.adminSecret,
      })
      .expect(200);

    const results: ExpandedTeamResult[] = response.body;
    results.forEach((result) => {
      if (result.id === bonusTeam.id) {
        expect(result.bonusPointsAwarded).toBe(bonusPointsForIdeaPitch);
        expect(result.finalScore).toBe(result.score + bonusPointsForIdeaPitch);
      } else {
        expect(result.bonusPointsAwarded).toBe(0);
        expect(result.finalScore).toBe(result.score);
      }
    });
  });

  it('will return an error if insuffucient votes have been cast', async () => {
    // Delete all judging votes data
    await JudgingVote.delete({});

    const { app } = require('../../app');
    const response = await supertest(app)
      .get('/api/judging/results/')
      .set({
        Authorization: env.adminSecret,
      })
      .expect(200);

    expect(response.body).toHaveLength(0);
  });
});
