    merged.updated_at = new Date();

    merged.sync_status = 'pending';


    return merged;

  }


  private async mergeField(data: any, fieldPath: string, newValue: any): Promise<void> {

    const currentValue = this.getFieldByPath(data, fieldPath);
    

    if (Array.isArray(currentValue) && Array.isArray(newValue)) {
      // Merge arrays, remove duplicates

      const merged = [...new Set([...currentValue, ...newValue])];
      this.setFieldByPath(data, fieldPath, merged);
    } else if (typeof currentValue === 'object' && typeof newValue === 'object') {
      // Merge objects recursively
      this.setFieldByPath(data, fieldPath, {
        ...currentValue,
        ...newValue
      });

    } else {

      // For other types, use the new value

      this.setFieldByPath(data, fieldPath, newValue);

    }
  }


  private getFieldByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {

      return current && current[key] !== undefined ? current[key] : undefined;

    }, obj);
  }

  private setFieldByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (current[key] === undefined || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  async manualResolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge', mergeData?: any): Promise<void> {
    const conflicts = this.activeConflicts.value;
    const conflict = conflicts.find(c => c.id === conflictId);
    
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    let resolvedData: any;

    switch (resolution) {
      case 'local':
        resolvedData = conflict.localData;
        break;
      
      case 'remote':
        resolvedData = conflict.remoteData;
        break;
      
      case 'merge':
        resolvedData = mergeData || {
          ...conflict.localData,
          ...conflict.remoteData,
          updated_at: new Date()
        };
        break;
    }

    // Update the resolved data in database
    await this.applyResolution(conflict.type, resolvedData);

    conflict.resolved = true;
    conflict.resolution = resolution;
    this.updateConflict(conflict);

    console.log(`Manually resolved conflict ${conflictId} with ${resolution} strategy`);
  }

  private async applyResolution(type: string, data: any): Promise<void> {
    switch (type) {
      case 'patient':
        await this.updatePatientData(data);
        break;
      
      case 'session':
        await this.updateSessionData(data);
        break;

      

      case 'epidemiology':

        await this.updateEpidemiologyData(data);

        break;

    }
  }

  private async updatePatientData(data: any): Promise<void> {

    await this.database.write(async () => {
      const patients = this.database.collections.get('patients');
      const patient = await patients.find(data.id);
      
      await patient.update((p: any) => {
        Object.keys(data).forEach(key => {
          if (key !== 'id') {

            p[key] = data[key];

          }

        });

        p.updated_at = new Date();

        p.sync_status = 'pending';
      });
    });

  }

  private async updateSessionData(data: any): Promise<void> {
    await this.database.write(async () => {
      const sessions = this.database.collections.get('diagnostic_sessions');
      const session = await sessions.find(data.id);
      
      await session.update((s: any) => {
        Object.keys(data).forEach(key => {
          if (key !== 'id') {
            s[key] = data[key];
          }
        });
        s.updated_at = new Date();
        s.sync_status = 'pending';
      });
    });
  }

  private async updateEpidemiologyData(data: any): Promise<void> {
    await this.database.write(async () => {
      const epidemiology = this.database.collections.get('epidemiology_cache');
      const cache = await epidemiology.find(data.id);
      
      await cache.update((e: any) => {
        Object.keys(data).forEach(key => {
          if (key !== 'id') {
            e[key] = data[key];
          }
        });
        e.updated_at = new Date();
        e.sync_status = 'pending';
      });
    });
  }

  getActiveConflicts(): BehaviorSubject<Conflict[]> {
    return this.activeConflicts;
  }

  getUnresolvedConflicts(): Conflict[] {
    return this.activeConflicts.value.filter(conflict => !conflict.resolved);
  }

  private updateConflict(updatedConflict: Conflict): void {
    const conflicts = this.activeConflicts.value.map(conflict =>
      conflict.id === updatedConflict.id ? updatedConflict : conflict

    );
    this.activeConflicts.next(conflicts);

  }


  removeResolvedConflicts(): void {

    const unresolved = this.getUnresolvedConflicts();

    this.activeConflicts.next(unresolved);
  }


  setResolutionStrategy(type: string, strategy: ResolutionStrategy): void {
    this.resolutionStrategies.set(type, strategy);

  }

  private generateConflictId(): string {
    const timestamp = Date.now().toString(36);

    const random = Math.random().toString(36).substr(2, 9);

    return `conflict_${timestamp}_${random}`;
  }

}
