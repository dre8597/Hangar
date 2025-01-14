/* eslint-disable no-dupe-class-members */

import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';

@Entity('configuration')
export class Config extends BaseEntity {
  constructor(key: string, value: string) {
    super();

    this.key = key;
    this.value = value;
  }

  @PrimaryColumn()
  key: string;

  @Column({ type: 'jsonb', nullable: true, default: null })
  value: string | number | boolean | null;

  /**
   * @deprecated Use `Config.getValueAs(key, 'boolean', true)` instead
   */
  static async findToggleForKey(key: string): Promise<boolean> {
    return Config.getValueAs(key, 'boolean', true);
  }

  /**
   * Get the value of a Config item that is a string, and throw an error if it's not
   */
  static async getValueAs(key: string, valueType: 'string', shouldThrow: true): Promise<string>;

  /**
   * Get the value of a Config item that is a boolean, and throw an error if it's not
   */
  static async getValueAs(key: string, valueType: 'boolean', shouldThrow: true): Promise<boolean>;

  /**
   * Get the value of a Config item that is a number, and throw an error if it's not
   */
  static async getValueAs(key: string, valueType: 'number', shouldThrow: true): Promise<number>;

  /**
   * Get the value of a Config item that is a string, and return null if it's not
   */
  static async getValueAs(key: string, valueType: 'string', shouldThrow: false): Promise<string | null>;

  /**
   * Get the value of a Config item that is a boolean, and return null if it's not
   */
  static async getValueAs(key: string, valueType: 'boolean', shouldThrow: false): Promise<boolean | null>;

  /**
   * Get the value of a Config item that is a number, and return null if it's not
   */
  static async getValueAs(key: string, valueType: 'number', shouldThrow: false): Promise<number | null>;

  static async getValueAs(key: string, valueType: 'string' | 'boolean' | 'number', shouldThrow: boolean): Promise<string | boolean | number | null> {
    const item = await this.findOne({ key });

    if (item.value === null && shouldThrow) {
      throw new Error('Value was null');
    }

    // eslint-disable-next-line valid-typeof
    if (typeof item.value !== valueType) {
      if (shouldThrow) {
        throw new Error(`Value was of undesired type. Requested type was ${valueType} but found ${typeof item.value}.`);
      } else {
        return null;
      }
    }

    return item.value;
  }
}
